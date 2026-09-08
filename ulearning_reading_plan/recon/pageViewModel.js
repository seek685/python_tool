define([
  "knockout",
  "model/Page",
  "model/PageElement",
  "tools/GuideCookie",
  "tools/Doc",
  "tools/Pdf",
  "tools/AudioScript",
  "tools/ImageViewer",
], function (
  ko,
  Page,
  PageElement,
  GuideCookie,
  Doc,
  Pdf,
  AudioScript,
  ImageViewer
) {
  return function pageViewModel(params) {
    var self = this;

    self.page = params.page;
    self.onlyVideo = ko.observable(false);
    self.hasQuestion = ko.observable(false);
    self.onlyOneQuestion = ko.observable(false);
    self.hideVideoForQuestion = ko.observable(false);
    self.appMode = window.appMode;
    if (!window.mobileMode) {
      if (self.page.pageElements().length == 1) {
        // 判断是否是单视频页面
        if (self.page.pageElements()[0].type() == 4) {
          self.onlyVideo(true);
        }
      }
    }
    // 判断是否只有一个习题组件
    for (var i = 0; i < self.page.pageElements().length; i++) {
      var pageElement = self.page.pageElements()[i];
      if (pageElement.type() == 6) {
        if (i == 0) {
          self.onlyOneQuestion(true);
        } else {
          self.onlyOneQuestion(false);
          break;
        }
      }
    }

    // 替换页面组件中的资源dom
    for (var i = 0; i < self.page.pageElements().length; i++) {
      var element = self.page.pageElements()[i];

      try {
        while (element.content().indexOf("http://leicloud.qiniudn.com") != -1)
          element.content(
            element
            .content()
            .replace(
              "http://leicloud.qiniudn.com",
              CONFIG_QINIU_RESOURCE_URL
            )
          );
      } catch (e) {}

      if (element.type() == 4) {
        element.showOuterSrt = ko.observable(false); // 是否显示外挂字幕
        element.trackHtmlArr = ko.observableArray([]); // 外挂字幕文本数组
        element.showInnerSrt = ko.observable(false); // 是否显示内部字幕
      }
      if (element.type() == 6) {
        self.hasQuestion(true);
      }
      if (window.mobileMode && element.type() == 15) {
        element.type(14);
      }
      for (var j = 0; j < element.resources().length; j++) {
        var resource = element.resources()[j];
        var reg = new RegExp("\\$\\{resource_" + resource.id() + "\\}", "g");
        if (resource.isFlash()) {
          element.content(
            element
            .content()
            .replace(reg, '<div id="resource' + resource.id() + '"></div>')
          );
        } else {
          var imgSrc = resource.location();
          imgSrc = buildResourcePath(imgSrc);
          preLoadImg(imgSrc);

          if (resource.width()) {
            var width = parseInt(resource.width());
            var maxWidth = $(window).width() - 40;
            if (width > maxWidth) {
              if (resource.height()) {
                var height = parseInt(resource.height());
                height = (height * maxWidth) / width;
                resource.height(height);
              }
              resource.width(maxWidth);
            }
          }

          var style =
            (resource.style() ? resource.style() + ";" : ";") +
            (resource.width() ? "width:" + resource.width() + "px;" : "") +
            (resource.height() ? "height:" + resource.height() + "px;" : "");
          style = style == ";" ? "" : style;

          element.content(
            element
            .content()
            .replace(
              reg,
              '<img class="resource-img" id="resource' +
              resource.id() +
              '" alt="' +
              koLearnCourseViewModel.i18nMsgText().imgNotDhow +
              '" src="' +
              imgSrc +
              '" style="' +
              style +
              '">'
            )
          );
        }
      }
    }
    // 初始化页面组件中的flash资源
    setTimeout(function () {
      for (var i = 0; i < self.page.pageElements().length; i++) {
        var element = self.page.pageElements()[i];

        for (var j = 0; j < element.resources().length; j++) {
          var resource = element.resources()[j];
          if (resource.isFlash()) {
            var flashadr = resource.location();
            flashadr = buildResourcePath(flashadr);
            var params = {};
            params.quality = "high";
            params.wmode = "transparent";
            params.bgcolor = "#ffffff";
            params.allowfullscreen = "true";
            var flashvars = {};
            // swfobject.embedSWF(flashadr, "resource" + resource.id(), "700", "500",
            //   "10", "", flashvars, params);
            if ($("#elementFlash" + element.id()).length > 0) {
              swfobject.embedSWF(
                flashadr,
                "elementFlash" + element.id(),
                "700",
                "500",
                "9.0.0",
                "/learnCourse/3rdlib/swfobject-2.2/swfobject/expressInstall.swf",
                flashvars,
                params
              );
              $("#elementFlash" + element.id()).css({
                "margin-bottom": "36px",
              });
              isFlashLoaded("elementFlash" + element.id());
            } else {
              swfobject.embedSWF(
                flashadr,
                "resource" + resource.id(),
                "700",
                "500",
                "9.0.0",
                "/learnCourse/3rdlib/swfobject-2.2/swfobject/expressInstall.swf",
                flashvars,
                params
              );
              $("#resource" + resource.id()).css({
                "margin-bottom": "36px",
              });
              isFlashLoaded("resource" + resource.id());
            }
          }
        }

        // 处理单个图片的图文
        // if (!(element.type() == 4 || element.type() == 6 ||
        //     element.type() == 10 || element.type() == 13 ||
        //     element.type() == 14 || element.type() == 15 ||
        //     element.type() == 16 || element.type() == 17)) {
        //   if ($("#pageElement" + element.id() + " img").siblings().length == 0) {
        //     $("#pageElement" + element.id() + " img").css({
        //       "display": "block"
        //     });
        //   }
        // }
      }

      if (window.appMode) {
        for (var i = 0; i < self.page.pageElements().length; i++) {
          var pageElement = self.page.pageElements()[i];

          // 处理链接
          if (
            !(
              pageElement.type() == 4 ||
              pageElement.type() == 6 ||
              pageElement.type() == 10 ||
              pageElement.type() == 13 ||
              pageElement.type() == 14 ||
              pageElement.type() == 15 ||
              pageElement.type() == 16 ||
              pageElement.type() == 17
            )
          ) {
            var links = $("#pageElement" + pageElement.id()).find("a");
            for (var j = 0; j < links.length; j++) {
              var link = links.eq(j);

              var linkUrl = link.attr("href");
              // var host = location.origin + location.pathname;
              // host = host.substring(0, host.lastIndexOf("/"));
              // linkUrl = host + "/externalLink.html?link=" + encodeURIComponent(linkUrl);
              link.removeAttr("href");
              link.attr("data-link", linkUrl);

              link.click(function () {
                var linkUrl = $(this).attr("data-link");
                window.ULplugin.UApp.openUrl(linkUrl, true);
              });
            }
          }
        }
      }

      // 处理BB资源
      var bbImages = $('[data-bbtype="image"]');
      for (var i = 0; i < bbImages.length; i++) {
        var bbImage = bbImages.eq(i);

        bbImage.after('<img src="' + bbImage.attr("href") + '">');
        bbImage.remove();
      }

      var bbVideos = $('[data-bbtype="video"]');
      for (var i = 0; i < bbVideos.length; i++) {
        var bbVideo = bbVideos.eq(i);

        bbVideo.after('<video src="' + bbVideo.attr("href") + '" controls>');
        self.init3rdVideo($(bbVideo).next())
        bbVideo.remove();
      }

      var bbAudios = $('[data-bbtype="audio"]');
      for (var i = 0; i < bbAudios.length; i++) {
        var bbAudio = bbAudios.eq(i);

        bbAudio.after('<audio src="' + bbAudio.attr("href") + '" controls>');
        bbAudio.remove();
      }

      var bbAttachments = $('[data-bbtype="attachment"]');
      for (var i = 0; i < bbAttachments.length; i++) {
        var bbAttachment = bbAttachments.eq(i);
        var url = bbAttachment.attr("url")

        if (url) {
          var fileType = url.substr(url.lastIndexOf(".") + 1).toLowerCase();
          switch (fileType) {
            case "jpg":
            case "png":
            case "gif":
            case "jpeg":
            case "bmp":
              bbAttachment.after('<img src="' + url + '">');
            case "mp4":
            case "avi":
            case "wmv":
            case "rm":
            case "rmvb":
            case "mpeg":
            case "mpg":
            case "mov":
              bbAttachment.after('<video src="' + url + '" controls>');
              self.init3rdVideo($(bbAttachment).next())
            case "mp3":
            case "wav":
              bbAttachment.after('<audio src="' + url + '" controls>');
              break;
            default:
          }
        } else {
          bbAttachment.after('<span>' + bbAttachment.attr("filepath") + '</span>');
        }


        bbAttachment.remove();
      }
    });

    /* 单词释义 */
    $("body").off("click", "glossary");
    $("body").on("click", "glossary", function () {
      var title = $(this).text();
      var course = new CoursePlugin();
      course.glossary(title, function (content) {
        content = content ?
          content :
          '<div class="no-glossary"><img src="./img/default_nocontent.png" /><div>哎呀呀，没有内容~</div></div>';
        $.showScript(title, content);
      });
    });

    /* 图片全屏 */
    $("body").off("click", ".resource-img,.oc-block img");
    $("body").on("click", ".resource-img,.oc-block img", function () {
      var url = $(this).attr("src");
      var imageViewer = new ImageViewer(url, this);
    });

    /* 注释组件 */
    {
      if (!window.mobileMode) {
        $("body").off("mouseenter mouseleave", "note");
        $("body").on("mouseenter mouseleave", "note", function (event) {
          try {
            var noteText = this.getAttribute("data-note");
            if (noteText) {
              if (event.type == "mouseenter") {
                //鼠标悬浮
                showNote(this);
              } else if (event.type == "mouseleave") {
                //鼠标离开
                hideNote(this);
              }
            }
          } catch (e) {}
        });
      } else {
        $("body").off("click", "note");
        $("body").on("click", "note", function () {
          var title = $(this).text();
          var noteText = this.getAttribute("data-note");

          $("#mobileNote .note-title").text(title);
          $("#mobileNote .note-text").text(noteText);
          $("#mobileNote").modal("show");
        });
      }

      function showNote(element) {
        var noteText = element.getAttribute("data-note");

        $(element).append(
          '\
<div class="note-panel">\
  <div class="note-arrow"></div>\
  <div class="note-title">' +
          element.textContent +
          '</div>\
  <div class="note-text-wrapper">\
    <div class="note-text">' +
          noteText +
          "</div>\
  </div>\
</div>"
        );
        $(".note-panel .note-text-wrapper").perfectScrollbar();

        // 默认向右下显示，判断是否需要反向
        var sideDistance = $(".note-panel")[0].getBoundingClientRect();
        if (sideDistance.right > $(window).width()) {
          // 向左显示
          $(".note-panel").addClass("show-left");
        }
        if (sideDistance.bottom > $(window).height()) {
          // 向上显示
          $(".note-panel").addClass("show-top");
        }
      }

      function hideNote(element) {
        $(element).find(".note-panel").remove();
      }
    }

    self.isMenuPack = ko.observable(false) //知识点学习默认收起
    self.nowKnowledge = ko.observable()

    self.openKnowledge = function(knowledge) {
      self.nowKnowledge(knowledge.id)

      let url = KG_WEB_HOST + '/pc.html#/uaStudy/' + knowledge.knowledgeId + '?textbookId=' + getUrlParam("courseId")

      let quizUrl =  KG_WEB_HOST + '/pc.html#/uaStudyQuiz'

      $('#knowledge').html('<iframe id="knowledgeIframe" src="' + url + '" frameborder="0"></iframe>')

      $('#knowledgeQuiz').html('<iframe id="knowledgeIframeQuiz" src="' + quizUrl + '" frameborder="0"></iframe>')

      self.isMenuPack(true)

      var cb = function (e) {
        console.log(e);
        if (e.data.code == 'closeCb') {
          self.isMenuPack(false)
          self.nowKnowledge(null)
        }
        if (e.data.code == 'uaStudyQuiz') {
          $('#knowledgeQuiz')[0].style.display = 'block'
          $('#knowledgeIframeQuiz')[0].contentWindow.postMessage(e.data, quizUrl)
        }
        if (e.data.code == 'quizClose') {
          $('#knowledgeQuiz')[0].style.display = 'none'
        }
        if (e.data.code == 'submitQuizCb') {
          $('#knowledgeIframe')[0].contentWindow.postMessage('update', url)
        }
      }

      window.removeEventListener('message', cb, false);
      window.addEventListener('message', cb, false);
    }

    // 加载页面组件
    setTimeout(function () {
      // 渲染公式
      try {
        MathJax.Hub.Queue(["Typeset", MathJax.Hub, "MathDiv"]);
      } catch (e) {}

      // 初始化组件中的视频音频和flash
      for (var i = 0; i < self.page.pageElements().length; i++) {
        var element = self.page.pageElements()[i];
        switch (element.type()) {
          case 4:
            // 处理替换视频的问题
            if (self.page.record().status()) {
              var videoRecord = element.record();
              videoRecord.status(1);
              videoRecord.viewProgress(100);
            }
            // 视频参数处理
            var mediaArg = $(
              "#pageElement" + element.id() + " .file-media"
            ).attr("data-playerarg");
            if (!mediaArg) {
              mediaArg = $("#pageElement" + element.id() + " .file-media").attr(
                "data-mediaarg"
              );
            }
            if (!mediaArg) {
              self.page.pageElements.splice(i, 1);
              i--;
              continue;
            }
            try {
              mediaArg = JSON.parse(unescape(mediaArg));
            } catch (e) {
              break;
            }
            if (mediaArg.file == "src") {
              mediaArg.file = mediaArg.src;
            }
            mediaArg.file = buildResourcePath(mediaArg.file);
            // 先从客户端返回的里面取
            if (
              element.appRolePlayData &&
              element.appRolePlayData.resourceFullurl
            ) {
              mediaArg.file = element.appRolePlayData.resourceFullurl;
            }
            if(
              element.appRolePlayData && element.appRolePlayData.videoCover
            ){
              mediaArg.videoCover = element.appRolePlayData.videoCover
            }
            if (
              !mediaArg.file &&
              element.rolePlayData() &&
              element.rolePlayData().resourceFullurl
            ) {
              mediaArg.file = element.rolePlayData().resourceFullurl;
            }

            if (
              mediaArg.file.indexOf("file") == 0 ||
              mediaArg.file.indexOf("cdvfile") == 0
            ) {
              mediaArg.image = "./img/videoImage.png";
            } else {
              if (mediaArg.avator) {
                mediaArg.image = buildResourcePath(mediaArg.avator);
                if (
                  element.rolePlayData() &&
                  element.rolePlayData().avatorFullurl &&
                  window.appMode
                ) {
                  mediaArg.image = element.rolePlayData().avatorFullurl;
                }
              } else {
                if(mediaArg.file.indexOf("ulearning") != -1){
                  mediaArg.image =
                  mediaArg.file + "?vframe/jpg/offset/1";
                  // /w/800/h/450
                } else {
                  mediaArg.image = ""
                }
              }
            }
            if (mediaArg.videoCover) {
              mediaArg.image = mediaArg.videoCover
            }
            mediaArg.autostart = mediaArg.auto;
            if (element.trackArg() && element.trackArg().srtType != 1) {
              var caption = element.trackArg().location;
              caption =
                element.trackArg().locationFullurl && window.appMode ?
                element.trackArg().locationFullurl :
                caption;
              caption = buildResourcePath(caption);
              mediaArg.captionForMobile = caption; // 原生video用
              mediaArg.playlist = [];
              mediaArg.playlist[0] = {
                file: mediaArg.file,
                image: mediaArg.image,
                tracks: [{
                  file: caption,
                  kind: "captions",
                  default: true,
                }, ],
              };
              mediaArg.captions = {
                back: false,
                color: "#ffffff",
                fontsize: 16,
              };
            }

            mediaArg.width = mediaArg.width ? mediaArg.width : 840;
            mediaArg.width = 840;
            var maxWindowWidth = $(window).width() - 40;
            if (window.mobileMode) {
              mediaArg.width =
                mediaArg.width < maxWindowWidth ?
                mediaArg.width :
                maxWindowWidth;
            }

            $("#pageElement" + element.id() + " .file-media").css({
              width: mediaArg.width > 840 ? 840 : mediaArg.width + "px",
              padding: "0",
            });
            $("#pageElement" + element.id() + " .video-container").css({
              width: mediaArg.width > 840 ? 840 : mediaArg.width + "px",
            });

            mediaArg.width = "100%";
            if (self.onlyVideo()) {
              mediaArg.height = "100%";
              $("#pageElement" + element.id() + " .file-media").css({
                width: "100%",
              });
              $("#pageElement" + element.id() + " .video-container").css({
                width: "100%",
              });
            } else {
              mediaArg.aspectratio = "16:9";
            }

            element.notFirstPlay = false;
            /* 听力原文 */
            $pageEle = $("#pageElement" + element.id());
            if ($pageEle.find(".file-media[data-audioscript]").length > 0) {
              var content = $pageEle
                .find(".file-media[data-audioscript]")
                .data("audioscript");
              // console.log(content);
              var audioScript = new AudioScript(
                $pageEle.find(".video-element"),
                unescape(content)
              );
            }

            if (window.appMode) {
              var downloadStatus = window.isResourceDownloaded(
                window.koLearnCourseViewModel.currentPage().relationId(),
                mediaArg.file
              );
              if (typeof downloadStatus == "string") {
                element.downloadStatus("downloaded");
                mediaArg.file = downloadStatus;
              } else if (typeof downloadStatus == "object") {
                element.downloadStatus("downloading");
              }
              if (
                mediaArg.file.indexOf("file") == 0 ||
                mediaArg.file.indexOf("cdvfile") == 0
              ) {
                element.downloadStatus("downloaded");
              }

              if (mediaArg.file.indexOf(".m3u8") == -1) {
                element.canDownload(true);
              }
            }

            element.downloadMediaArg = mediaArg;
            self.downloadVideo = function (ele) {
              if (ele.downloadStatus() == "downloading") {
                return;
              }
              var filePugin = new UFilePlugin();
              var date = new Date();
              var mediaArg = ele.downloadMediaArg;
              // filePugin.download(mediaArg.file + "?time=" + date.getTime(), progressCb, successCb, errorCb);
              // console.log(mediaArg.file);
              // filePugin.download(mediaArg.file, progressCb, successCb, errorCb);
              window.downloadCallbackObj[mediaArg.file] = {
                progressFunction: progressCb,
                successFunction: successCb,
                errorFunction: errorCb,
              };
              window.CoursePlayer.course.downloadFile(
                window.koLearnCourseViewModel.currentChapter().id(),
                window.koLearnCourseViewModel.currentSection().id(),
                window.koLearnCourseViewModel.currentPage().id(),
                mediaArg.file,
                progressCb,
                successCb,
                errorCb
              );

              ele.downloadStatus("downloading");

              function progressCb(filePath, progress) {
                // console.log("progress--------" + progress);
                $(".download-progress .water").css("height", progress + "%");
                $(".download-progress span").text(koLearnCourseViewModel.i18nMsgText().download + ' ' + progress + "%");
              }

              function successCb(filePath, localFilePath) {
                // console.log("successCb");
                // console.log(localFilePath);
                if (ele.rolePlayData()) {
                  ele.rolePlayData().resourceFullurl = localFilePath;
                } else {
                  ele.rolePlayData({});
                  ele.rolePlayData().resourceFullurl = localFilePath;
                }

                setTimeout(function () {
                  ele.downloadStatus("downloaded");
                  // var video = "file:///" + localFilePath;
                  var videoDom = $("#elementVideo" + ele.id())[0];
                  videoDom.src = localFilePath;
                }, 500);
              }

              function errorCb(filePath, error) {
                console.error(error);
                ele.downloadStatus("notDownload");
              }
            };

            initMobileVideo(element);
            break;
          case 5:
            // 音频处理
            $("#pageElement" + element.id() + " .file-media").css({
              padding: "0",
            });
            var mediaArg = $(
              "#pageElement" + element.id() + " .file-media"
            ).attr("data-playerarg");
            if (!mediaArg) {
              mediaArg = $("#pageElement" + element.id() + " .file-media").attr(
                "data-mediaarg"
              );
            }
            try {
              mediaArg = JSON.parse(unescape(mediaArg));
            } catch (e) {
              break;
            }
            if (mediaArg.file == "src") {
              mediaArg.file = mediaArg.src;
            }
            mediaArg.file = buildResourcePath(mediaArg.file);
            if (
              element.rolePlayData() &&
              element.rolePlayData().resourceFullurl
            ) {
              mediaArg.file = buildResourcePath(element.rolePlayData().resourceFullurl);
            }
            $("#pageElement" + element.id() + " .file-media").addClass(
              "audio-container"
            );

            var track = "";
            if (element.trackArg() && element.trackArg().location) {
              track =
                '<track src="' +
                buildResourcePath(element.trackArg().location) +
                '" srclang="en" label="English" kind="subtitles" type="text/vtt">';
            }
            $("#pageElement" + element.id() + " .file-media").append(
              '<div><audio class="custom-audio" id="elementAudio' +
              element.id() +
              '" src="' +
              mediaArg.file +
              '" preload="metadata" controls="controls">' +
              track +
              '</audio></div>\
                <div class="audio-remark">' +
              (element.remark() ? element.remark() : "") +
              "</div>"
            );
            initCustomAudio("#elementAudio" + element.id(), "normal");

            /* 听力原文 */
            $pageEle = $("#pageElement" + element.id());
            if ($pageEle.find(".file-media[data-audioscript]").length > 0) {
              var content = $pageEle
                .find(".file-media[data-audioscript]")
                .data("audioscript");
              var audioScript = new AudioScript(
                $pageEle.find(".file-media[data-audioscript]"),
                unescape(content)
              );
            }
            break;
          case 14:
          case 15:
            // 音频文字组件处理
            for (var j = 0; j < element.audiotexts().length; j++) {
              var audiotext = element.audiotexts()[j];
              var audioPath = audiotext.audioLocation();
              audioPath = buildResourcePath(audioPath);
              // audioPath = "";
              if (j % 2 == 0) {
                $("#audiotext" + audiotext.textid()).addClass("left-audio");
              }

              $(
                "#audiotext" + audiotext.textid() + " .audio-text-audio"
              ).append(
                '<audio class="custom-audio-text" src="' +
                audioPath +
                '" preload="metadata" controls="controls"></audio>'
              );
              initCustomAudio(
                "#audiotext" + audiotext.textid() + " audio",
                "audioText"
              );
            }
            break;
          case 9:
            // flash处理
            $("#pageElement" + element.id() + " .file-media").css({
              "margin-bottom": "36px",
            });
            $("#pageElement" + element.id() + " .file-media").append(
              '<div id="elementFlash' + element.id() + '"></div>'
            );

            var mediaArg = $(
              "#pageElement" + element.id() + " .file-media"
            ).attr("data-playerarg");
            if (!mediaArg) {
              mediaArg = $("#pageElement" + element.id() + " .file-media").attr(
                "data-mediaarg"
              );
            }
            try {
              mediaArg = JSON.parse(unescape(mediaArg));
            } catch (e) {
              break;
            }

            var flashadr = mediaArg.file;
            if (flashadr == "src") {
              flashadr = mediaArg.src;
            }
            flashadr = buildResourcePath(flashadr);
            var params = {};
            params.quality = "high";
            params.wmode = "transparent";
            params.bgcolor = "#ffffff";
            params.allowfullscreen = "true";
            var flashvars = {};
            swfobject.embedSWF(
              flashadr,
              "elementFlash" + element.id(),
              mediaArg.width,
              mediaArg.height,
              "9.0.0",
              "/learnCourse/3rdlib/swfobject-2.2/swfobject/expressInstall.swf",
              flashvars,
              params
            );
            isFlashLoaded("elementFlash" + element.id());
            break;
          case 12:
            // 图文组件，旧数据flash处理
            var oldFlashDoms = $(
              "#pageElement" + element.id() + " .file-media"
            );
            for (var j = 0; j < oldFlashDoms.length; j++) {
              var oldFlashDom = oldFlashDoms.eq(j);

              oldFlashDom.css({
                "margin-bottom": "36px",
              });
              oldFlashDom.append(
                '<div id="elementFlash' + element.id() + j + '"></div>'
              );

              var mediaArg = oldFlashDom.attr("data-mediaarg");
              try {
                mediaArg = JSON.parse(unescape(mediaArg));
              } catch (e) {
                break;
              }

              var flashadr = mediaArg.src;
              flashadr = buildResourcePath(flashadr);
              var params = {};
              params.quality = "high";
              params.wmode = "transparent";
              params.bgcolor = "#ffffff";
              params.allowfullscreen = "true";
              var flashvars = {};
              swfobject.embedSWF(
                flashadr,
                "elementFlash" + element.id() + j,
                mediaArg.width,
                mediaArg.height,
                "9.0.0",
                "/learnCourse/3rdlib/swfobject-2.2/swfobject/expressInstall.swf",
                flashvars,
                params
              );
              isFlashLoaded("elementFlash" + element.id() + j);
            }
            break;
          case 10:
            // 文档处理 见文档组件
            break;
          case 13:
            // 处理角色扮演页面
            // var sRoleplayXML = CONFIG_API_HOST + "/" + element.id() + ".xml";
            // if (localStorage.viewXml) {
            //   sRoleplayXML = localStorage.viewXml;
            // }
            // var rPath = CONFIG_QINIU_RESOURCE_URL;
            // var sRoleplayswf = '../common/lib/roleplay/roleplay.swf';

            // function getLeoRoleplay(sRoleplayXML, rPath) {
            //   var params = {};
            //   params.quality = "high";
            //   params.wmode = "transparent";
            //   params.bgcolor = "#ffffff";
            //   params.allowfullscreen = "true";
            //   var flashvars = {
            //     "XMLFile": sRoleplayXML,
            //     "rPath": rPath
            //   };
            //   swfobject.embedSWF(sRoleplayswf, "activerole", "700", "500", "10", "", flashvars, params);
            //   isFlashLoaded("activerole");
            // }
            // getLeoRoleplay(sRoleplayXML, rPath);

            break;
          default:
        }
      }
    });

    function initMobileVideo(element) {
      var mediaArg = element.downloadMediaArg;
      $("#pageElement" + element.id() + " .file-media").html("");
      $("#pageElement" + element.id() + " .file-media").append(
        '<video controls crossorigin="anonymous" class="custom-video" id="elementVideo' +
        element.id() +
        '" data-id="elementVideo' +
        element.id() +
        '" width="100%" height="100%" preload="metadata" style="max-width: 100%, max-height: 100%" playsinline webkit-playsinline="true" x5-playsinline="true" x-webkit-airplay="allow"></video>'
      );

      var videoDom = $("#elementVideo" + element.id())[0];
      videoDom.src = buildResourcePath(mediaArg.file);
      if (mediaArg.captionForMobile) {
        $("#pageElement" + element.id() + " .file-media video").append(
          '<track src="' +
          mediaArg.captionForMobile +
          '" kind="subtitles" srclang="en" label="默认字幕" default="default" />'
        );
      }

      element.notFirstPlay = false;

      // 将element对象赋值在页面的dom对象上，plugin中元素就可以获取到element对象了
      var _videoDom = $("#pageElement" + element.id() + " .file-media video")[0]
      _videoDom.element = element

      var features = [
        "playpause",
        "current",
        "progress",
        "duration",
        "tracks",
        "volume",
        "setting",
        "fullscreen",
      ];
      if (!(getPlatform() == "android-platform" || getPlatform() == "harmony-platform" || window.is3rdMode || window.is3rdMode2) && window.videoSpeed) {
        features = [
          "playpause",
          "current",
          "progress",
          "duration",
          "tracks",
          "volume",
          "speed",
          "setting",
          "fullscreen",
        ];
      }
      var poster = mediaArg.image
      if (mediaArg.file.indexOf('.m3u8') > -1) {
        poster = mediaArg.file.replace('.m3u8', '.jpg')
      }
      var videoMedia = $("#pageElement" + element.id() + " .file-media video").mediaelementplayer({
        // Do not forget to put a final slash (/)
        pluginPath: "./3rdlib/mediaelement-3.2.4/plugins/",
        features: features,
        speeds: ["0.75", "1.00", "1.25", "1.50", '2.00'],
        // this will allow the CDN to use Flash without restrictions
        // (by default, this is set as `sameDomain`)
        shimScriptAccess: "always",
        poster: poster,
        // toggleCaptionsButtonWhenOnlyOne: true,
        startLanguage: "en",
        // more configuration
        useFakeFullscreen: true,
        success: function (media, node, instance) {
          var videoInstance = media.getElementsByTagName("video")[0];
          var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
          var element = self.page.getElementById(id);
          videoInstance.oncontextmenu = function () {
            return false
          }
          
          var errorHandler = function (a, b) {
            var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
            var element = self.page.getElementById(id);
            $("#pageElement" + element.id() + " .video-wrapper").hide();
            $("#pageElement" + element.id() + " .mobile-video-error").show();

            if (
              videoInstance.src.indexOf("file") == 0 ||
              videoInstance.src.indexOf("cdvfile") == 0
            ) {
              $(".error-message-2").show();
              $(".error-message-1").hide();
            } else {
              $(".error-message-1").show();
              $(".error-message-2").hide();
            }
          };
          var playHandler = function () {
            var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
            var element = self.page.getElementById(id);

            element.record().startEndTimeList.push({
              startTime: parseInt(new Date().getTime() / 1000),
              endTime: parseInt(new Date().getTime() / 1000),
            });

            if (window.appMode) {
              window.ULplugin.UApp.networkState(function (state) {
                if (
                  state != 1 &&
                  !window.videoUserConfirm &&
                  videoInstance.src.indexOf("umooc_cordova") == -1 &&
                  videoInstance.src.indexOf("file") != 0 &&
                  videoInstance.src.indexOf("cdvfile") != 0
                ) {
                  videoInstance.pause();

                  koLearnCourseViewModel.modalType("videoNoWifi");

                  koLearnCourseViewModel.alertModal.show(
                    function () {
                      window.videoUserConfirm = true;
                      videoInstance.play();
                    },
                    function () {},
                    function () {}
                  );
                }
              });
            }
            skipHeadAndTail(videoInstance, element)
            if(element.trackArg() && element.trackArg().srtType != 1) {
              self.toggleInnerSrt(element, Boolean(window.Ulearning.user.enableSubtitle))
            } else if(element.trackArg() && element.trackArg().srtType === 1){
              self.toggleOuterSrt(element, Boolean(window.Ulearning.user.enableSubtitle))
            }
          };
          // var endedHandler = function() {
          //   // var videoInstance = this;
          //   var id = videoInstance.getAttribute("data-id").substring("elementVideo".length);
          //   var element = self.page.getElementById(id);

          //   if (element.record().viewTime() < videoInstance.duration) {
          //     element.record().viewTime(videoInstance.duration);
          //   }
          //   element.record().positionTime(0);
          //   element.record().viewProgress(100);
          //   element.record().status(1);
          // };
          var curTrackIndex = -1;
          var timeupdateHandler = function () {
            if (videoInstance.seeking || !videoInstance.duration) {
              return;
            }
            // var videoInstance = this;
            var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
            var element = self.page.getElementById(id);

            if (!element.notFirstPlay) {
              videoInstance.currentTime = element.record().positionTime();
              element.startTime = videoInstance.currentTime;
              element.notFirstPlay = true;
              if (!window.isHnrc) {
                saveWatchVideoBehavior(element.record().videoId());
              }
            }
            // 处理视频中的习题
            if (element.videoQuestions().length > 0) {
              for (var i = 0; i < element.videoQuestions().length; i++) {
                var videoQuestion = element.videoQuestions()[i];
                var judgeTime =
                  videoInstance.currentTime - videoQuestion.pointTime();
                if (
                  !videoQuestion.hasLearned() &&
                  judgeTime > 0 &&
                  judgeTime < 1
                ) {
                  videoInstance.pause();

                  try {
                    exitFull();
                  } catch (error) {
                    
                  }

                  element.currentVideoQuestion(videoQuestion);
                  var modalSelector = "#pageElement" + element.id() + " .video-question-modal"
                  $(
                    modalSelector + " .modal-content"
                  ).perfectScrollbar();
                  $(modalSelector).modal({
                    backdrop: "static",
                    keyboard: false,
                    show: true,
                  });
                  self.hideVideoForQuestion(true)

                  if (isIE()) {
                    setTimeout(function () {
                      element.showVideoQuestion(true);
                    }, 100);
                  }
                  $(modalSelector)
                    .off("shown.bs.modal")
                    .on("shown.bs.modal", function (e) {
                      element.showVideoQuestion(true);
                    });
                  $(modalSelector)
                    .off("hidden.bs.modal")
                    .on("hidden.bs.modal", function (e) {
                      self.hideVideoForQuestion(false)
                      if (element.currentVideoQuestion().needReview) {
                        for (
                          var j = 0; j < element.videoQuestions().length; j++
                        ) {
                          var videoQuestion = element.videoQuestions()[j];

                          if (videoQuestion == element.currentVideoQuestion()) {
                            if (videoQuestion.pointTime() < 10) {
                              videoInstance.currentTime = 0;
                            } else {
                              videoInstance.currentTime =
                                videoQuestion.pointTime() - 10;
                            }
                            videoInstance.play();
                            break;
                          }
                        }
                      } else {
                        element.currentVideoQuestion().hasLearned(true);
                        videoInstance.play();
                      }
                    });
                }
                // if (judgeTime > 1 && videoQuestion.hasLearned()) {
                //   videoQuestion.hasLearned(false);

                //   videoQuestion.koModel.redoQuiz();
                // }
              }
            }

            // 防止360等小窗口播放时可拖拽
            if (videoInstance.currentTime - element.startTime > 5) {
              if (
                videoInstance.currentTime >
                element.record().maxPositionTime() &&
                !element.record().status() &&
                !window.koLearnCourseViewModel.isPreviewMode()
              ) {
                // 超过最远观看距离时自动回退
                videoInstance.currentTime = element.startTime;
                return;
              } else {
                // 允许向不超过最远播放位置的位置跳转，先记录当前播放时长
                element.startTime = videoInstance.currentTime;
              }
            }
            // 记录最远播放时间，用来防拖拽
            if (
              videoInstance.currentTime > element.record().maxPositionTime()
            ) {
              element.record().maxPositionTime(videoInstance.currentTime);
            }
            // 记录视频总播放时长
            element.startTime = element.startTime ?
              element.startTime :
              videoInstance.currentTime;
            var addTime = videoInstance.currentTime - element.startTime;
            addTime = addTime > 0 ? addTime : 0;
            element.record().viewTime(element.record().viewTime() + addTime);
            element.startTime = videoInstance.currentTime;
            // 记录当前播放位置
            element.record().positionTime(videoInstance.currentTime);
            // 计算视频学习进度
            var viewProgress =
              (element.record().viewTime() * 100.0) / (videoInstance.duration - (Number(element.rolePlayData().skipVideoTitle) || 0));
            if (videoInstance.currentTime >= videoInstance.duration) {
              viewProgress = 100;
              element
                .record()
                .viewTime(
                  element.record().viewTime() >= videoInstance.duration ?
                  element.record().viewTime() :
                  videoInstance.duration
                );
            }
            if (viewProgress >= 95) {
              viewProgress = 100;
              element.record().status(1);
            }

            try {
              viewProgress = viewProgress.toFixed(1);
            } catch (e) {}
            element.record().viewProgress(viewProgress);
            element.record().videoDuration(videoInstance.duration);
            try {
              element.record().startEndTimeList[
                element.record().startEndTimeList.length - 1
              ].endTime = parseInt(new Date().getTime() / 1000);
            } catch (error) {}
            element.record().hasLearned = true;
            // 处理替换视频的问题
            if (
              self.page.record().status() &&
              element.record().viewProgress() < 95
            ) {
              element.record().viewProgress(100);
              element.record().status(1);
            }

            // 同步外挂字幕的进度
            if (element.showOuterSrt() && element.trackHtmlArr().length) {
              var centerIndex = -1;
              for (var s = 0; s < element.trackHtmlArr().length; s++) {
                var curTrack = element.trackHtmlArr()[s];
                if (
                  videoInstance.currentTime >= curTrack.start &&
                  videoInstance.currentTime <= curTrack.stop
                ) {
                  centerIndex = s;
                  curTrack.className("center");
                } else if (
                  videoInstance.currentTime > curTrack.start &&
                  videoInstance.currentTime > curTrack.stop
                ) {
                  curTrack.className("prev");
                } else {
                  curTrack.className("");
                }
              }
              try {
                if (centerIndex > -1 && centerIndex != curTrackIndex) {
                  curTrackIndex = centerIndex;
                  var trackPanel = $(
                    "#pageElement" +
                    element.id() +
                    " .video-wrapper .video-track-wrapper"
                  );
                  trackPanel.animate({
                      scrollTop: $(".track-item").eq(centerIndex)[0].offsetTop -
                        trackPanel.height() / 2 +
                        20,
                    },
                    100
                  );
                }
              } catch (error) {}
            }
          };
          var seekingHandler = function () {
            // var videoInstance = this;
            var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
            var element = self.page.getElementById(id);

            // 视频防拖拽，已经学完的视频不用处理
            if (
              window.antiDrag &&
              videoInstance.currentTime > (element.record().maxPositionTime() + 3) &&
              !element.record().status() &&
              !window.koLearnCourseViewModel.isPreviewMode()
            ) {
              // 超过最远观看距离时自动回退
              videoInstance.currentTime = element.record().positionTime();
            } else {
              // 允许向不超过最远播放位置的位置跳转，先记录当前播放时长
              element.startTime = videoInstance.currentTime;
              element.record().hasLearned = true;
            }
          };
          var canplay = function() {
            var id = videoInstance
              .getAttribute("data-id")
              .substring("elementVideo".length);
            var element = self.page.getElementById(id);
            var headLength = element.rolePlayData().skipVideoTitle || 0
            // skipHeadAndTail(videoInstance, element)
            function turnSetDot() {
              var a = 0
              var totalLength = element.rolePlayData().videoLength || videoInstance.duration
              if(!totalLength) {
                setTimeout(function() {
                  turnSetDot()
                }, 100)
              } else {
                if(!totalLength || totalLength <= headLength) {
                  return
                }
                addDot(videoInstance, element, headLength)
              }
            }
            if(window.Ulearning && window.Ulearning.user && window.Ulearning.user.enableSkipVideoTitle && headLength && headLength > 0) {
              turnSetDot()
            }
          }
          media.addEventListener("canplay", canplay);
          media.addEventListener("error", errorHandler);
          media.addEventListener("play", playHandler);
          // media.addEventListener("ended", endedHandler);
          media.addEventListener("timeupdate", timeupdateHandler);
          media.addEventListener("seeking", seekingHandler);

          // 监听setting.js里定义的 是否跳过片头事件
          $(media).on("setSkip", function(event, status) {
            setUser({
              enableSkipVideoTitle: Number(status)
            },
              function(res) {
                if(res.code === 1) {
                  window.Ulearning && window.Ulearning.user ? 
                    window.Ulearning.user.enableSkipVideoTitle = Number(status) : 
                    window.Ulearning ? 
                      window.Ulearning.user = { enableSkipVideoTitle: Number(status) } : 
                      window.Ulearning = {user: {enableSkipVideoTitle: Number(status)}}
                  skipHeadAndTail(videoInstance, element)
                }
                
              }            
            )
          })
          // 监听setting.js里定义的 是否开启字幕事件
          $(media).on("setSubtitle", function(event, status) {
            setUser({
              enableSubtitle: Number(status)
            },
              function(res) {
                if(res.code === 1) {
                  window.Ulearning && window.Ulearning.user ? 
                    window.Ulearning.user.enableSubtitle = Number(status) : 
                    window.Ulearning ? 
                      window.Ulearning.user = { enableSubtitle: Number(status) } : 
                      window.Ulearning = {user: {enableSubtitle: Number(status)}}
                  window.element = element
                  if(element.trackArg() && element.trackArg().srtType != 1) {
                    self.toggleInnerSrt(element, status)
                  } else if(element.trackArg() && element.trackArg().srtType === 1){
                    self.toggleOuterSrt(element, status)
                  }
                }
              }            
            )
          })
        },
      });
      setTimeout(function () {
        $(".mejs__captions-selector-label[for='mep_0_captions_none']").text(
          koLearnCourseViewModel.i18nMsgText().closeSubtitle
        );
        $(
          ".mejs__captions-selector-label[for='mep_0_track_0_subtitles_en']"
        ).text(koLearnCourseViewModel.i18nMsgText().openSubtitle);
      }, 1000);
    }

    // 修改用户视频偏好设置
    function setUser(data, callback) {
      try {
        var Authorization = getCookie("token");
        $.ajax({
          url: CONFIG_API_HOST + "/user",
          type: "PATCH",
          contentType: "text/plain",
          dataType: "json",
          async: true,
          data: JSON.stringify(data),
          // beforeSend: function (xhr, info) {
          //   xhr.setRequestHeader("Content-Type", "application/json");
          //   xhr.setRequestHeader("UA-AUTHORIZATION", Authorization);
          // },
          success: function (result, status, xhr) {
            console.log(result, status, xhr)
            callback && callback(result, status, xhr)
          },
          error: function (xhr, status, error) {
            console.log(error);
          },
          complete: function (xhr, status) {},
        });
      } catch (e) {}
    }
    
    self.initMobileVideo = function (element) {
      initMobileVideo(element);
      $("#pageElement" + element.id() + " .video-wrapper").show();
      $("#pageElement" + element.id() + " .mobile-video-error").hide();
    };
    self.init3rdVideo = function (dom) {
      var features;
      if (
        getPlatform() == "android-platform" ||
        window.is3rdMode ||
        window.is3rdMode2
      ) {
        features = [
          "playpause",
          "current",
          "progress",
          "duration",
          "tracks",
          "volume",
          "setting",
          "fullscreen",
        ];
      } else {
        features = [
          "playpause",
          "current",
          "progress",
          "duration",
          "tracks",
          "volume",
          "speed",
          "setting",
          "fullscreen",
        ];
      }
      var videoMedia = $(dom).mediaelementplayer({
        // Do not forget to put a final slash (/)
        pluginPath: "./3rdlib/mediaelement-3.2.4/plugins/",
        features: features,
        speeds: ["0.75", "1.00", "1.25", "1.50"],
        // this will allow the CDN to use Flash without restrictions
        // (by default, this is set as `sameDomain`)
        shimScriptAccess: "always",
        // toggleCaptionsButtonWhenOnlyOne: true,
        startLanguage: "en",
        // more configuration
        useFakeFullscreen: true,
        success: function (media, node, instance) {
          var videoInstance = media.getElementsByTagName("video")[0];
          videoInstance.oncontextmenu = function () {
            return false
          }
        }
      });
    };

    self.showVideoRemark = function () {
      $(".only-video-remark-panel").addClass("slide-in");
    };
    self.hideVideoRemark = function () {
      $(".only-video-remark-panel").removeClass("slide-in");
    };
    // 点击字幕跳转到指定视频帧
    self.goToVideoFrame = function (element, trackItem) {
      if (trackItem.start <= element.record().maxPositionTime()) {
        var videoInstance = $("#elementVideo" + element.id())[0];
        videoInstance.currentTime = trackItem.start;
      }
    };
    // 切换外挂字幕的显示隐藏
    self.toggleOuterSrt = function (element, status) {
      if(element.showOuterSrt() === status) {
        return
      }
      if (!element.trackHtmlArr().length) {
        getTrackText(element.trackArg().location, function (trackHtmlArr) {
          if (trackHtmlArr && trackHtmlArr.length) {
            for (var s = 0; s < trackHtmlArr.length; s++) {
              trackHtmlArr[s].className = ko.observable("");
              element.trackHtmlArr.push(trackHtmlArr[s]);
            }
            $(
              "#pageElement" +
              element.id() +
              " .video-wrapper .video-track-wrapper"
            ).perfectScrollbar();
          }
        });
      }
      $("#pageElement" + element.id() + " .video-wrapper").toggleClass(
        "showOuterSrt"
      );
      element.showOuterSrt(!element.showOuterSrt());
    };
    // 切换视频内字幕的显示影藏
    self.toggleInnerSrt = function (element, status) {
      // status ? 
      // $('.mejs__captions-layer.mejs__layer').show() :
      // $('.mejs__captions-layer.mejs__layer').hide()
      // if(element.showInnerSrt() === status) {
      //   return
      // }
      var eleDom = $("#pageElement" + element.id() + " .video-wrapper")
      console.log('toggleInnerSrt')
      status ? 
        eleDom.hasClass('hideInnerSrt') ? eleDom.removeClass('hideInnerSrt') : ''
        : eleDom.hasClass('hideInnerSrt') ? '' : eleDom.addClass('hideInnerSrt')
      // $("#pageElement" + element.id() + " .video-wrapper").toggleClass(
      //   "hideInnerSrt"
      // );
      element.showInnerSrt(status);
    }

    function getTrackText(src, callbackSuccess, callbackError) {
      var httpReg = /^(http|https)/;
      if (httpReg.test(src)) {
        src = src.replace(
          "http://leicloud.ulearning.cn/",
          CONFIG_QINIU_RESOURCE_URL
        );
        src = src.replace(
          "http://leicloud.qiniudn.com/",
          CONFIG_QINIU_RESOURCE_URL
        );
      } else {
        src = CONFIG_QINIU_RESOURCE_URL + src;
      }
      $.ajax({
        url: src,
        type: "GET",
        contentType: "text/plain",
        dataType: "text",
        // async: true,
        // data: null,
        success: function (result, status, xhr) {
          var trackHtmlArr =
            typeof result === "string" && /<tt\s+xml/gi.exec(result) ?
            TrackFormatParser.dfxp.parse(result) :
            TrackFormatParser.webvtt.parse(result);
          callbackSuccess && callbackSuccess(trackHtmlArr);
        },
        error: function (xhr, status, error) {
          console.log(error);
          callbackError && callbackError();
        },
      });
      // 将字幕中的时间格式转化为秒（从mediaelement.js中复制来）
      function convertSMPTEtoSeconds(SMPTE) {
        if (typeof SMPTE !== "string") {
          throw new TypeError("Argument must be a string value");
        }
        SMPTE = SMPTE.replace(",", ".");
        var decimalLen = ~SMPTE.indexOf(".") ? SMPTE.split(".")[1].length : 0;
        var secs = 0,
          multiplier = 1;
        SMPTE = SMPTE.split(":").reverse();
        for (var i = 0, total = SMPTE.length; i < total; i++) {
          multiplier = 1;
          if (i > 0) {
            multiplier = Math.pow(60, i);
          }
          secs += Number(SMPTE[i]) * multiplier;
        }
        return Number(secs.toFixed(decimalLen));
      }
      // 将字幕按句子转化为数组（从mediaelement.js中复制来）
      var TrackFormatParser = {
        webvtt: {
          pattern: /^((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{1,3})?) --\> ((?:[0-9]{1,2}:)?[0-9]{2}:[0-9]{2}([,.][0-9]{3})?)(.*)$/,
          parse: function parse(trackText) {
            var lines = trackText.split(/\r?\n/),
              entries = [];
            var timecode = void 0,
              text = void 0,
              identifier = void 0;
            for (var i = 0, total = lines.length; i < total; i++) {
              timecode = this.pattern.exec(lines[i]);
              if (timecode && i < lines.length) {
                if (i - 1 >= 0 && lines[i - 1] !== "") {
                  identifier = lines[i - 1];
                }
                i++;
                text = lines[i];
                i++;
                while (lines[i] !== "" && i < lines.length) {
                  text = text + "\n" + lines[i];
                  i++;
                }
                text = text
                  .trim()
                  .replace(
                    /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
                    "<a href='$1' target='_blank'>$1</a>"
                  );
                entries.push({
                  identifier: identifier,
                  start: (0, convertSMPTEtoSeconds)(timecode[1]) === 0 ?
                    0.2 : (0, convertSMPTEtoSeconds)(timecode[1]),
                  stop: (0, convertSMPTEtoSeconds)(timecode[3]),
                  text: text,
                  settings: timecode[5],
                });
              }
              identifier = "";
            }
            return entries;
          },
        },
        dfxp: {
          parse: function parse(trackText) {
            trackText = $(trackText).filter("tt");
            var container = trackText.firstChild,
              lines = container.querySelectorAll("p"),
              styleNode = trackText.getElementById(
                "" + container.attr("style")
              ),
              entries = [];
            var styles = void 0;
            if (styleNode.length) {
              styleNode.removeAttribute("id");
              var attributes = styleNode.attributes;
              if (attributes.length) {
                styles = {};
                for (var i = 0, total = attributes.length; i < total; i++) {
                  styles[attributes[i].name.split(":")[1]] =
                    attributes[i].value;
                }
              }
            }
            for (
              var _i16 = 0, _total13 = lines.length; _i16 < _total13; _i16++
            ) {
              var style = void 0,
                _temp = {
                  start: null,
                  stop: null,
                  style: null,
                  text: null,
                };
              if (lines.eq(_i16).attr("begin")) {
                _temp.start = (0, convertSMPTEtoSeconds)(
                  lines.eq(_i16).attr("begin")
                );
              }
              if (!_temp.start && lines.eq(_i16 - 1).attr("end")) {
                _temp.start = (0, convertSMPTEtoSeconds)(
                  lines.eq(_i16 - 1).attr("end")
                );
              }
              if (lines.eq(_i16).attr("end")) {
                _temp.stop = (0, convertSMPTEtoSeconds)(
                  lines.eq(_i16).attr("end")
                );
              }
              if (!_temp.stop && lines.eq(_i16 + 1).attr("begin")) {
                _temp.stop = (0, convertSMPTEtoSeconds)(
                  lines.eq(_i16 + 1).attr("begin")
                );
              }
              if (styles) {
                style = "";
                for (var _style in styles) {
                  style += _style + ":" + styles[_style] + ";";
                }
              }
              if (style) {
                _temp.style = style;
              }
              if (_temp.start === 0) {
                _temp.start = 0.2;
              }
              _temp.text = lines
                .eq(_i16)
                .innerHTML.trim()
                .replace(
                  /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
                  "<a href='$1' target='_blank'>$1</a>"
                );
              entries.push(_temp);
            }
            return entries;
          },
        },
      };

      //     self.fcontent("1\n\
      // 00:00:20,353 --> 00:00:24,047\n\
      // 云在动画片中的形象是多种多样的\n\
      // \n\
      // 2\n\
      // 00:00:24,729 --> 00:00:27,835\n\
      // 既可以用比较写实的方法加以表达\n\
      // \n\
      // 3\n\
      // 00:00:28,533 --> 00:00:32,099\n\
      // 又可以画成装饰风格较强的图案\n");
      //     callbackSuccess && callbackSuccess();
    }

    function saveWatchVideoBehavior(videoId) {
      try {
        var classId = getUrlParam("classId");
        var courseId = getUrlParam("courseId");
        var chapterId = window.koLearnCourseViewModel.currentChapter().id();
        if (!classId) {
          return;
        }
        var data = {
          classId: parseInt(classId),
          courseId: parseInt(courseId),
          chapterId: parseInt(chapterId),
          videoId: videoId,
        };
        var Authorization = getCookie("AUTHORIZATION");
        $.ajax({
          url: API_SERVER_HOST + "/behavior/watchVideo",
          type: "POST",
          contentType: "text/plain",
          dataType: "json",
          async: true,
          data: JSON.stringify(data),
          beforeSend: function (xhr, info) {
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("Authorization", Authorization);
          },
          success: function (result, status, xhr) {},
          error: function (xhr, status, error) {
            console.log(error);
          },
          complete: function (xhr, status) {},
        });
      } catch (e) {}
    }

    function isFlashLoaded(domId) {
      if (window.mobileMode) {
        $("#" + domId).append(
          '<img src="./img/i18n/' + window.lang + '/mobileFlash.png" />'
        );
        return;
      }
      setTimeout(function () {
        var flashDom = $("#" + domId);
        if (flashDom.length > 0 && flashDom.eq(0).attr("type")) {} else {
          // 弹出不支持flash的提示
          koLearnCourseViewModel.modalType("flashFailed");

          koLearnCourseViewModel.alertModal.show(
            function () {},
            function () {},
            function () {}
          );
        }
      }, 2000);
    }

    function preLoadImg(url) {
      var img = new Image();
      img.src = url;
    }

    function exitFull() {
      // 判断各种浏览器，找到正确的方法
      var exitMethod =
        document.exitFullscreen || //W3C
        document.mozCancelFullScreen || //FireFox
        document.webkitExitFullscreen || //Chrome等
        document.webkitExitFullscreen; //IE11
      if (exitMethod) {
        exitMethod.call(document);
      } else if (typeof window.ActiveXObject !== "undefined") {
        //for Internet Explorer
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript !== null) {
          wscript.SendKeys("{F11}");
        }
      }
    }

    function getHiddenProp() {
      var prefixes = ["webkit", "moz", "ms", "o"];

      // if 'hidden' is natively supported just return it
      if ("hidden" in document) return "hidden";

      // otherwise loop over all the known prefixes until we find one
      for (var i = 0; i < prefixes.length; i++) {
        if (prefixes[i] + "Hidden" in document) return prefixes[i] + "Hidden";
      }

      // otherwise it's not supported
      return null;
    }

    function isHidden() {
      var prop = getHiddenProp();
      if (!prop) return false;

      return document[prop];
    }

    // 跳过片头
    function skipHeadAndTail(videoInstance, element) {
      var flag = 0
      var headLength = element.rolePlayData().skipVideoTitle || 0
      var totalLength = element.rolePlayData().videoLength || videoInstance.duration
      // console.log('videoInstance', videoInstance)
      // console.log('videoLength', element.rolePlayData().videoLength)
      // window.videoInstance = element.rolePlayData().videoInstance
      // console.log('跳过片头', element)
      // window.element = element
      
      
      if(headLength && window.Ulearning && window.Ulearning.user && window.Ulearning.user.enableSkipVideoTitle === 1) {
        
        if(!totalLength) {
          setTimeout(function() {
            skipHeadAndTail(videoInstance, element)
          }, 100)
        }
        // console.log('totalLength', totalLength)
        // console.log('headLength', headLength)
        if(!totalLength || totalLength <= headLength) {
          return
        }
        if(!videoInstance.hasSkipHead) {
          addDot(videoInstance, element, headLength)
        }
        if(videoInstance.currentTime <= headLength && videoInstance.getPaused() === false) {
          if(element.record().maxPositionTime() < headLength) {
            element.record().maxPositionTime(headLength);
          }
          if(element.record().positionTime() < headLength) {
            element.record().positionTime(headLength)
            videoInstance.currentTime = headLength
          }
          // videoInstance.hasSkipHead = true
        }
      } else {
        videoInstance.hasSkipHead = undefined
        removeDot(videoInstance)
      }
    }
    // 新增片头片尾标记点
    function addDot(videoInstance, element, headLength) {
      // console.log(videoInstance.duration)
      $(videoInstance).parents('.mejs__inner').addClass('recordHead')
      setDot()
      videoInstance.hasSkipHead = true
      // 设置定位点
      function setDot() {
        setTimeout(function() {
          var totalLength = element.rolePlayData().videoLength || videoInstance.duration
          if(totalLength && totalLength > 1) {
            if(!headLength || headLength > totalLength) { // 定位为0或者大于视频时长时不设置圆点
              return
            }
            $(videoInstance).parents('.mejs__inner').find('.mejs__time-slider').append("<span class='dot'></span>")
            var ratio = (headLength / totalLength) * 100
            $(videoInstance).parents('.mejs__inner').find('.mejs__time-slider .dot').css({
              left: ratio + '%'
            })
          } else {
            setDot()
          }
        }, 50)
      }
    }
    // 移除片头标记点
    function removeDot(videoInstance) {
      $(videoInstance).parents('.mejs__inner').removeClass('recordHead')
    }
  };
});