define([
  "knockout",
  "model/Course",
  "model/Chapter",
  "model/Section",
  "model/Page",
  "model/User",
  "tools/NoAction",
  "tools/Timer",
  "tools/GuideCookie",
  "tools/Wave",
  "tools/Modal",
  "tools/Alert",
  "../components/questionView/questionViewModel",
  "text!../components/questionView/questionView.html",
  "../components/questionElementView/questionElementViewModel",
  "text!../components/questionElementView/questionElementView.html",
], function (
  ko,
  Course,
  Chapter,
  Section,
  Page,
  User,
  NoAction,
  Timer,
  GuideCookie,
  Wave,
  Modal,
  Alert,
  questionViewModel,
  questionViewTemplate,
  questionElementViewModel,
  questionElementTemplate
) {
  return function learnCourseViewModel() {
    var self = this;
    window.test = this;
    // 打桩数据
    // setCookie("token", "68C7FC3AAD2E9858BAA913479D72698E");
    // setCookie("callbackurl", "http://www.hnpxw.org/learner/studyEnd.do");
    // setCookie("token", "B3B8AB59D3F383685DE4B0B0C3CE4089");
    // ?courseId=8109&chapterId=2201808&sectionId=27986&pageId=408315&isPreview=true
    // ?courseId=7899&chapterId=2201546&isPreview=true
    if (!window.appMode) {
      window.AUTHORIZATION = getCookie("token");
      if (!window.AUTHORIZATION) {
        var token = getUrlParam("token");
        window.AUTHORIZATION = token;
      }
    }

    var lang =
      getCookie("lang") || navigator.language || navigator.browserLanguage;
    if (navigator.userAgent.indexOf("umoocApp") !== -1) {
      var ua =
        window.navigator.userAgent.indexOf("-language-") != -1
          ? window.navigator.userAgent
          : "";
      var start = ua.indexOf("-language-") + "-language-".length;
      var end = ua.indexOf(" ", start);
      end = end == -1 ? ua.length : end;

      try {
        lang =
          ua.substring(start, end) ||
          navigator.language ||
          navigator.browserLanguage;
      } catch (e) {}
    }

    self.i18nMsgText = ko.observable({}); //外层国际化语言
    window.i18nMsgText = {};
    initLang();

    $.ajaxSetup({
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("UA-AUTHORIZATION", window.AUTHORIZATION);
        xhr.setRequestHeader("AUTHORIZATION", window.AUTHORIZATION);
        if (lang) {
          xhr.setRequestHeader("Accept-Language", lang);
        }

        //REVIEW_TEACHERID 免登陆模式 免登陆教师页面（会携带用户信息写入后台写入cookie） 携带指定header给后台权限判断
        var REVIEW_TEACHERID = getCookie("REVIEW_TEACHERID"); //免登陆访问的用户id
        if (
          window.AUTHORIZATION == "REVIEW_TEACHER_TOKEN" &&
          REVIEW_TEACHERID
        ) {
          xhr.setRequestHeader("REVIEW_TEACHERID", REVIEW_TEACHERID);
        }

        // 低版本ie处理(ie8,9无法在请求中添加自定义header)
        var browser = BrowserType();
        if (browser == "IE9" || browser == "IE8") {
          var url = this.url;
          if (url.indexOf("?") == -1) {
            url += "?timestamp=" + window.AUTHORIZATION;
          } else {
            url += "&timestamp=" + window.AUTHORIZATION;
          }
          url += "&time=" + new Date();
          this.url = url;
        }
      },
      timeout: 120 * 1000,
      complete: function (xhr, status) {
        try {
          xhr.responseJSON = JSON.parse(xhr.responseText);
        } catch (e) {}

        if (xhr.status == 401) {
          if (
            !isAuditionMode &&
            (xhr.responseJSON.code == 2001 ||
              xhr.responseJSON.code == 2101 ||
              xhr.responseJSON.code == 2201)
          ) {
            Alert.show("danger", self.i18nMsgText().expiredToken2);
          }

          if (xhr.responseJSON.code == 2301) {
            // 异地登录处理
            window.ULplugin.User.loggedOnOtherDevices(
              function success() {},
              function fail() {
                Alert.show(
                  "danger",
                  (window.i18nMessageText && window.i18nMessageText.logTip) ||
                    "已在其他终端登录!"
                );
              }
            );

            setTimeout(function () {
              window.ULplugin.UApp.finish();
            }, 1000);
          }
        }
      },
    });
    var browser = BrowserType();
    if (browser == "IE9" || browser == "IE8") {
      //刷新session
      // function refreshSession() {
      //   if (window.isHnrc) {
      //     return;
      //   }
      //   $.ajax({
      //     url: CONFIG_API_HOST + "/umoocsession",
      //     type: "GET",
      //     // contentType: "application/json",
      //     // dataType: "json",
      //     async: true,
      //     data: null,
      //     success: function (result, status, xhr) {
      //       if (!result) {
      //         console.log(self.i18nMsgText().refreshSessionFail);
      //       } else {
      //         console.log(self.i18nMsgText().refreshSessionSuccess);
      //       }
      //     },
      //     error: function (xhr, status, error) {
      //       console.log(status);
      //     },
      //   });
      // }
      // refreshSession();
      // setInterval(refreshSession, 20 * 60 * 1000);
    }

    // 获取课程信息
    var courseId = getUrlParam("courseId");
    var chapterId = getUrlParam("chapterId");
    var sectionId = getUrlParam("sectionId");
    var pageId = getUrlParam("pageId");

    var classId = getUrlParam("classId");

    var isPreviewMode = getUrlParam("isPreview") == "true" ? true : false;
    var isAuthorPreview =
      getUrlParam("isAuthorPreview") == "true" ? true : false;
    window.isAuthorPreview = isAuthorPreview;
    var isAuditionMode = getUrlParam("isAudition") == "true" ? true : false;
    var notQRcode = getUrlParam("notQRcode") == "true" ? true : false;
    var is3rdMode = getUrlParam("is3rd") == "true" ? true : false; // 是否是三方用户
    window.is3rdMode = is3rdMode;
    var is3rdMode2 = getUrlParam("is3rd2") == "true" ? true : false; // 是否是三方用户
    window.is3rdMode2 = is3rdMode2;
    var isResourceMode = getUrlParam("isResource") == "true" ? true : false;
    if (isResourceMode) {
      appMode = false;
    }
    var isCurrentOnly = getUrlParam("isCurrentOnly") == "true" ? true : false;
    var isExpiredMode = false;
    var isWxMiniProgram =
      getUrlParam("isWxMiniProgram") == "true" ? true : false;
    window.antiDrag = 1; // 默认开启防拖拽

    self.returnUrl = getUrlParam("returnUrl");
    var jtoken = getUrlParam("jtoken");
    var trdCourseId = getUrlParam("trdCourseId");
    var callbackUrl = getUrlParam("callbackUrl");
    var isTeacherDevelopment = getUrlParam("isTeacherDevelopment") == 1;
    var showExit = getUrlParam("showExit") == 1;

    self.showExit = ko.observable(showExit);
    self.isOpsFor4k = getUrlParam("opsFor4k") == 1;
    self.isTeacherDevelopment = isTeacherDevelopment;
    self.mobileMode = mobileMode;
    self.appMode = appMode;
    self.platType = getPlatform();
    self.isPreviewMode = ko.observable(isPreviewMode); // 是否是预览模式
    self.isAuthorPreview = ko.observable(isAuthorPreview); // 是否是编辑预览
    self.isAuditionMode = ko.observable(isAuditionMode); // 是否是试听模式
    self.notQRcode = ko.observable(notQRcode); // 是否不是二维码进入
    self.isExpiredMode = ko.observable(isExpiredMode); // 是否已过期
    self.isWxMiniProgram = ko.observable(isWxMiniProgram); // 是否在小程序环境里
    self.isActivation = ko.observable(true); // 是否已激活
    self.is3rdMode = is3rdMode;
    self.isI18n = isI18n;
    self.isMenuPack = ko.observable(getUrlParam("isMenuPack") == 1); //目录菜单默认收起

    self.i18nMessageText = ko.observable({}); // 国际化资源对象
    self.userGuideType = ko.observable(); // 用户引导类型
    self.userGuideStep = ko.observable(1); // 用户引导步骤
    self.modalType = ko.observable(); // 提示框类型
    self.noStudyTime = ko.observable(0); // 中断学习时间

    self.loadFailed = ko.observable(false);
    window.i18nMessageText = {};
    // 提示框对象
    self.alertModal = new Modal("alertModal");

    var course = new Course(courseId);
    course.classId = classId;

    //语言切换
    function initLang() {
      var language = (
        navigator.browserLanguage
          ? navigator.browserLanguage
          : navigator.language
      ).toLowerCase();
      language = lang || language;

      if (language.indexOf("en") > -1) {
        language = "en";
        document.title = "Course Player";
      } else if (language.indexOf("id") > -1) {
        language = "id";
        document.title = "Player mata kuliah";
      } else if (language.indexOf("tw") > -1) {
        language = "tw";
        document.title = "課程播放器";
      } else if (language.indexOf("th") > -1) {
        language = "th";
        document.title = "เครื่องเล่นหลักสูตร";
      } else if (language.indexOf("es") > -1) {
        language = "es";
        document.title = "Jugador del curso";
      } else if (language.indexOf("ar") > -1) {
        language = "ar";
        document.title = "عربى";
      } else {
        language = "zh";
        document.title = "课程播放器";
        mejs.i18n.language("zh-CN");
      }
      lang = language;
      window.lang = self.lang = lang;

      document.documentElement.setAttribute("dir", "ltr");
      if (lang === "ar") {
        document.documentElement.setAttribute("dir", "rtl");
      }

      $(document.head)
        .find("link")
        .each(function () {
          if ($(this).attr("href") == "./css/english.css") {
            $(this).remove();
          }
        });
      if (language == "en") {
        $(document.head).append(
          '<link rel="stylesheet" href="./css/english.css">'
        );
      }
      if (language == "id") {
        $("head").append('<link rel="stylesheet" href="./css/id.css">');
      }
      if (language) {
        $("body").addClass("lang-" + language);
      }
      // $.get(
      //   "./common/lang/" + language + ".js?ver=2",
      //   function (res, status) {
      //     var json;
      //     try {
      //       json = JSON.parse(res)
      //     } catch (error) {
      //       json = res
      //     }
      //     self.i18nMsgText(json);
      //     window.i18nMsgText = self.i18nMsgText();
      //   }
      // );
      // get方法成功没回调 修改下面这张形式
      $.ajax({
        url: "./common/lang/" + language + ".js?ver=2",
        dataType: "text",
        type: "GET",
        success: function (res, status) {
          var json;
          try {
            json = JSON.parse(res);
          } catch (error) {
            json = res;
          }
          self.i18nMsgText(json);
          window.i18nMsgText = self.i18nMsgText();
        },
      });
    }
    // 页面初始化
    (function init() {
      $("#alertModal .close-btn").click(function () {
        $("#alertModal").modal("hide");
      });

      var user = new User();
      self.user = user;
      user.reterieveUser(function (res) {
        window.currentUserId = user.id();
        window.currentUserName = user.name();
        window.antiCheat = res.antiCheat;

        // 获取权限设置 防挂机权限id=97  支持倍速播放 id== 148
        user.getUserRights(function (list) {
          for (var i = 0; i < list.length; i++) {
            if (list[i].id == 97) {
              if (list[i].status) {
                initNoStudyTimer();
              }
            }
            if (list[i].id == 148) {
              if (list[i].status) {
                window.videoSpeed = true;
              }
            }
          }
        });

        if (res.antiDrag != undefined) {
          window.antiDrag = res.antiDrag;
        }

        var failureRecord = localStorage.failureRecord
          ? localStorage.failureRecord
          : {};
        try {
          failureRecord = JSON.parse(failureRecord);
        } catch (e) {
          failureRecord = {};
        }
        var count = 0;
        if (failureRecord[window.currentUserId]) {
          for (var i in failureRecord[window.currentUserId]) {
            if (failureRecord[window.currentUserId].hasOwnProperty(i)) {
              // 建议加上判断,如果没有扩展对象属性可以不加
              count++;
            }
          }
        }

        if (count > 0) {
          $.confirm({
            title: window.i18nMsgText.note || "提示",
            content:
              window.i18nMsgText.recoverRecordTip ||
              "检测到您有未提交成功的学习记录，是否现在恢复？",
            buttons: {
              confirm: {
                text: window.i18nMsgText.confirm || "确定",
                action: function () {
                  location = "recoveryRecord.html";
                },
              },
              cancel: {
                text: window.i18nMsgText.cancel || "取消",
                action: function () {},
              },
            },
          });
        }
      });
      // 判断播放器模式
      if (!isPreviewMode && !is3rdMode) {
        course.reterieveCourseRemaining(
          function (result) {
            if (result && result.time < 0) {
              isExpiredMode = true;
              self.isExpiredMode(isExpiredMode);
            }
            if (result && result.status == 0) {
              self.isActivation(false);
            }

            initCallback();
          },
          function () {
            initCallback();
          }
        );
      } else {
        initCallback();
      }
      // 学习模式判断有没有在学习别的页面
      function initCallback() {
        initResourceServer();
        // if (!isPreviewMode && !isExpiredMode) {
        //   // 学习模式先判断是否正在学习其他页面
        //   course.judgeIsLearning(
        //     function (result) {
        //       if (result.status == 1) {
        //         if (isWxMiniProgram) {
        //           initResourceServer();
        //           return;
        //         }
        //         self.modalType("multiLearning");

        //         self.alertModal.show(
        //           function () {
        //             self.goBack();
        //           },
        //           function () {
        //             // initResourceServer();
        //           },
        //           function () {
        //             initResourceServer();
        //           }
        //         );

        //         $("#courseName").text(result.courseName);
        //         $("#chapterName").text(result.chapterName);
        //         $("#sectionName").text(result.sectionName);
        //       } else {
        //         initResourceServer();
        //       }
        //     },
        //     function () {
        //       initResourceServer();
        //     }
        //   );
        // } else {
        //   initResourceServer();
        // }
      }
      // 获取资源服务器
      function initResourceServer() {
        course.reterieveResourceServer(
          function () {
            initData();
          },
          function () {
            initData();
          }
        );
      }
      // 转换pageId
      function convertPageId(pageId) {
        for (var i = 0; i < course.chapters().length; i++) {
          var chapter = course.chapters()[i];
          for (var j = 0; j < chapter.sections().length; j++) {
            var section = chapter.sections()[j];
            for (var k = 0; k < section.pages().length; k++) {
              var page = section.pages()[k];
              if (page.relationId() == pageId) {
                return page.id();
              }
            }
          }
        }

        return pageId;
      }
      // 课程数据初始化方法
      function initData() {
        // 获取课程基本信息
        course.reterieveCourseInfo(isAuditionMode, function () {
          document.title = course.name();
          $.get(
            "./locales/" +
              (course.locale() == 1 ? "en" : lang) +
              "/message.json?ver=2",
            function (res, status) {
              var json;
              try {
                json = JSON.parse(res);
              } catch (error) {
                json = res;
              }
              self.i18nMessageText(json);
              window.i18nMessageText = self.i18nMessageText();
            }
          );
          course.uncompletedNodes = []; //记录未完成的节id 用于节学完之后发送保存请求
          course.completeListener = setInterval(function () {
            var status = 1;
            if (
              self.currentSection() &&
              self.currentSection().page &&
              self.currentSection().pages()
            ) {
              for (var i = 0; i < self.currentSection().pages().length; i++) {
                var page = self.currentSection().pages()[i];
                var pageRecord = page.getRecord();

                if (pageRecord.status() != 1) {
                  // 所有页都学完才算本节学完
                  status = 0;
                }
              }
              // console.log(status,course.uncompletedNodes,self.currentSection().id())
              var sectionIndex = course.uncompletedNodes.indexOf(
                self.currentSection().id()
              );
              if (status && sectionIndex > -1) {
                if (!isPreviewMode && !isExpiredMode) {
                  console.log("节完成保存学习记录", self.currentSection());
                  self
                    .currentSection()
                    .createRecord(true, 1, self.currentChapter().id());
                  course.uncompletedNodes.splice(sectionIndex, 1);
                }
              }
            }
          }, 5000);
        });
        // 获取课程针对班级的设置
        // 没加班的学生默认可以重做
        self.questionManyChance = ko.observable(true);
        self.questionShowAnswer = ko.observable(true);
        course.reterieveCourseClassInfo(
          function (result) {
            if (!isPreviewMode) {
              self.questionManyChance = ko.observable(result.takeAgain);
              self.questionShowAnswer = ko.observable(result.showCorrect);
            }
          },
          function () {}
        );

        if (!self.isActivation()) {
          // self.loadFailed(true);
          $(".view-loader").fadeOut();
        } else {
          // 获取课程目录
          course.reterieveCourseDirectory(
            isAuthorPreview,
            isAuditionMode,
            notQRcode,
            function () {
              try {
                // 初始化滚动插件
                if (
                  !window.mobileMode ||
                  self.platType == "ios-platform" ||
                  window.innerWidth < 400
                ) {
                  $(".catalog-list-scroller").perfectScrollbar();
                  $(".page-scroller").perfectScrollbar({
                    suppressScrollX: true,
                  });
                }
              } catch (e) {}

              $(".view-loader").fadeOut();

              setTimeout(function () {
                // 将与班级相关的章id转换为原始章id
                for (var i = 0; i < course.chapters().length; i++) {
                  var chapter = course.chapters()[i];
                  if (chapterId && chapter.idForClass() == chapterId) {
                    chapterId = chapter.id();
                    break;
                  }
                }
                if (pageId) {
                  pageId = convertPageId(pageId);
                }

                // 如果课程已经过期，删除除了当前章之外的所有章
                if (
                  (isExpiredMode || is3rdMode || isCurrentOnly) &&
                  chapterId
                ) {
                  for (var i = 0; i < course.chapters().length; i++) {
                    var chapter = course.chapters()[i];
                    if (chapter.id() != chapterId) {
                      course.chapters.splice(i, 1);
                      i--;
                    } else {
                      chapter.sort = 0;
                    }
                  }
                }
                if (isResourceMode) {
                  if (sectionId) {
                    for (var i = 0; i < course.chapters().length; i++) {
                      var chapter = course.chapters()[i];

                      for (var j = 0; j < chapter.sections().length; j++) {
                        var section = chapter.sections()[j];

                        if (section.id() == sectionId) {
                          chapterId = chapter.id();
                          break;
                        }
                      }
                      if (chapterId) {
                        break;
                      }
                    }

                    var lastChapter;
                    for (var i = 0; i < course.chapters().length; i++) {
                      var chapter = course.chapters()[i];
                      if (chapter.id() != chapterId) {
                        course.chapters.splice(i, 1);
                        i--;
                      } else {
                        chapter.sort = 0;
                        chapter.isAudition(1);
                        lastChapter = chapter;
                      }
                    }
                    if (lastChapter) {
                      for (var i = 0; i < lastChapter.sections().length; i++) {
                        var section = lastChapter.sections()[i];

                        if (section.id() != sectionId) {
                          lastChapter.sections.splice(i, 1);
                          i--;
                        } else {
                          section.sort = 0;
                          section.isAudition(1);
                          for (var j = 0; j < section.pages().length; j++) {
                            var page = section.pages()[j];
                            page.isAudition(1);
                          }
                        }
                      }
                    }
                  } else {
                    for (var i = 0; i < course.chapters().length; i++) {
                      var chapter = course.chapters()[i];
                      if (chapter.id() != chapterId) {
                        course.chapters.splice(i, 1);
                        i--;
                      } else {
                        chapter.sort = 0;
                        chapter.isAudition(1);
                        for (var j = 0; j < chapter.sections().length; j++) {
                          var section = chapter.sections()[j];
                          section.isAudition(1);
                          for (var k = 0; k < section.pages().length; k++) {
                            var page = section.pages()[k];
                            page.isAudition(1);
                          }
                        }
                      }
                    }
                  }
                }
                if (
                  !pageId &&
                  !sectionId &&
                  localStorage["courseId" + courseId + "chapterId" + chapterId]
                ) {
                  pageId =
                    localStorage[
                      "courseId" + courseId + "chapterId" + chapterId
                    ];
                }
                if (
                  !pageId &&
                  !sectionId &&
                  !chapterId &&
                  localStorage["courseId" + courseId]
                ) {
                  pageId = localStorage["courseId" + courseId];
                }

                // 获取课程缓存的资源数量并反馈给后台 用于辅助判断作弊
                function getCourseCache(pageId, callback) {
                  window.CoursePlayer.course.initPage(
                    pageId,
                    function (jsonString) {
                      callback(pageId, jsonString);
                    }
                  );
                }

                if (window.appMode) {
                  var chapterPages = [];
                  var callbackNum = 0;
                  for (var i = 0; i < course.chapters().length; i++) {
                    var chapter = course.chapters()[i];
                    for (var j = 0; j < chapter.sections().length; j++) {
                      var section = chapter.sections()[j];
                      for (var n = 0; n < section.pages().length; n++) {
                        var page = section.pages()[n];
                        chapterPages.push(page.id());
                      }
                    }
                  }
                  for (var i = 0; i < chapterPages.length; i++) {
                    getCourseCache(chapterPages[i], function (id, jsonString) {
                      callbackNum++;
                      var downloadObj = JSON.parse(jsonString);
                      window.pageResourceMap[id] = downloadObj;
                      if (callbackNum == chapterPages.length) {
                        console.log(window.pageResourceMap);
                        var num = 0;
                        for (var key in pageResourceMap) {
                          var page = pageResourceMap[key];
                          for (var j = 0; j < page.models.length; j++) {
                            if (page.models[j].local) {
                              num++;
                            }
                          }
                        }
                        if (num > 0) {
                          course.postCachedResourceNum(num);
                        }
                      }
                    });
                  }
                }

                // 打开指定页面
                if ($("#page" + pageId + " .page-name").length > 0) {
                  $("#page" + pageId + " .page-name").click();
                } else if (
                  $("#section" + sectionId + " .page-item .page-name").length >
                  0
                ) {
                  $("#section" + sectionId + " .page-item .page-name")
                    .eq(0)
                    .click();
                } else if (
                  $("#chapter" + chapterId + " .page-item .page-name").length >
                  0
                ) {
                  $(
                    "#chapter" +
                      chapterId +
                      " .section-list .page-item .page-name"
                  )
                    .eq(0)
                    .click();
                } else {
                  $(".page-item .page-name").eq(0).click();
                }
              });
              setTimeout(function () {
                // 显示主流程引导
                showUserGuide("main");
              }, 1000);
            },
            function () {
              self.loadFailed(true);
              $(".view-loader").fadeOut();
            }
          );
        }
      }
    })();

    // 用户引导相关
    var guideCookie = new GuideCookie(0);
    var isShowingGuide = false;
    var nextGuide = [];

    // 判断是否需要显示对应类型的引导界面，需要才显示
    function showUserGuide(type) {
      if (mobileMode) {
        return;
      }
      if (guideCookie.userId == 0) {
        var user = new User();
        user.reterieveUser(function (res) {
          guideCookie.userId = user.id();
          window.userName = user.name;
          window.currentUserId = user.id();
          window.antiCheat = res.antiCheat;
          if (res.antiDrag != undefined) {
            window.antiDrag = res.antiDrag;
          }

          showUserGuide(type);
        });
        return;
      }
      if (guideCookie.isFirstTime(type)) {
        // 显示用户引导
        if (type == "video") {
          self.modalType("videoGuide");

          self.alertModal.show(
            function () {},
            function () {},
            function () {
              guideCookie.setVisited("video");
            }
          );
        } else {
          // 如果当前正在显示引导，将需要显示的下一个引导加入队列
          if (isShowingGuide) {
            nextGuide.push(type);
            return;
            // $(".user-guide").fadeOut();
            // $(".question-user-guide").fadeOut();
          }

          isShowingGuide = true;
          self.userGuideType(type);
          self.userGuideStep(1);
          $(".user-guide").removeClass("step1 step2 step3");
          $(".question-user-guide").removeClass("step1 step2 step3");

          if (type == "question") {
            $(".question-user-guide").fadeIn(200);
            // try {
            //   var pos = $(".learn-course-progress")[0].getBoundingClientRect();
            //   $(".user-guide").css({
            //     "top": pos.top + 60 + "px"
            //   });
            // } catch (e) {}
          } else if (type == "oralenglish") {
            $(".oralenglish-user-guide").fadeIn(200);
          } else {
            $(".user-guide").fadeIn(200);
          }
        }
      }
    }

    self.nextGuide = function () {
      // 最后一步指引后关闭指引气泡
      switch (self.userGuideType()) {
        case "main":
          if (self.userGuideStep() == 3) {
            self.hideGuide();
            return;
          }
          break;
        case "question":
          if (self.userGuideStep() == 1) {
            // try {
            //   var pos = $(".question-guide-wrapper .btn-submit")[0].getBoundingClientRect();
            //   $(".user-guide").css({
            //     "top": pos.top - 70 + "px",
            //     "left": pos.left + 160 + "px"
            //   });
            // } catch (e) {}
          }
          if (self.userGuideStep() == 2) {
            self.hideGuide();
            return;
          }
          break;
        case "video":
          break;
        case "oralenglish":
          if (self.userGuideStep() == 1) {
            self.hideGuide();
            return;
          }
          break;

        default:
      }

      self.userGuideStep(self.userGuideStep() + 1);
      $(".user-guide").removeClass("step1 step2 step3");
      $(".user-guide").addClass("step" + self.userGuideStep());
      $(".question-user-guide").removeClass("step1 step2 step3");
      $(".question-user-guide").addClass("step" + self.userGuideStep());
    };
    self.hideGuide = function () {
      $(".user-guide").fadeOut(200);
      $(".question-user-guide").fadeOut(200);
      $(".oralenglish-user-guide").fadeOut(200);
      isShowingGuide = false;
      guideCookie.setVisited(self.userGuideType());

      if (nextGuide.length > 0) {
        showUserGuide(nextGuide.shift());
      }
    };

    // 同步三方学习记录 url不带jtoken但是通过callbackurl cookie进行回调，在保存成功之后调用同步接口
    window.save3rdRecord = function () {
      var callbackurl = getCookie("callbackurl");
      if (!(is3rdMode && callbackurl)) {
        return;
      }
      if (callbackurl[0] == '"' || callbackurl[0] == "'") {
        callbackurl = callbackurl.substring(1, callbackurl.length - 1);
      }
      callbackurl = callbackurl
        ? callbackurl
        : "http://www.hnpxw.org/learner/studyEnd.do";
      var url =
        CONFIG_LOGIN_HOST +
        "/umooc/thirdparty/study.do?operation=logout&callbackurl=" +
        encodeURIComponent(callbackurl) +
        "&type=2&nodeID=" +
        chapterId +
        "&courseID=" +
        courseId +
        "&lmsThirdCourseId=" +
        getUrlParam("lmsThirdCourseId") +
        "&lmsThirdClassId=" +
        getUrlParam("lmsThirdClassId");
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.setRequestHeader("AUTHORIZATION", getCookie("token"));
      xhr.send();
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            console.log("success");
          } else {
            console.log("err");
          }
        }
      };
    };

    // url带jtoken保存学习记录后同步到第三方平台（例如paixunyun等）
    window.saveTo3rd = function () {
      if (jtoken) {
        var saveSuccess = 0;
        $.ajax({
          url: CONFIG_API_HOST + "/studyrecord/3rd",
          type: "GET",
          async: false,
          data: {
            jtoken: jtoken,
            trdCourseId: trdCourseId,
            chapterId: chapterId,
            classId: classId,
            callbackUrl: callbackUrl,
          },
          success: function (result, status, xhr) {
            saveSuccess = 1;
          },
          error: function (xhr, status, error) {
            console.log(status);
          },
        });

        if (!saveSuccess) {
          // alert("同步学习记录失败");
          return;
        }
      }
    };
    // 返回课程目录
    var isSavingGoBack = false;
    self.goBack = function () {
      var belong = getCookie("belong");
      console.log(belong);
      if (belong == "bt-sjjx") {
        setCookie("belong", -1, -1, "/");
        window.opener = null;
        window.open("", "_self");
        window.close();
      } else {
        if (isSavingGoBack) {
          return;
        }

        function goBackCallback() {
          if (navigator.userAgent.indexOf("umoocApp") != -1) {
            if (getUrlParam("unitId")) {
              window.broadcaster.fireNativeEvent("unitActivityRefresh", {});
            }
            window.ULplugin.UApp.finish();
            return;
          }
          if (isPreviewMode) {
            if (self.returnUrl) {
              window.location = decodeURIComponent(self.returnUrl);
              return;
            }
            window.open("", "_self", "");
            window.close();
          } else {
            if (is3rdMode) {
              if (isWxMiniProgram) {
                window.open("", "_self", "");
                window.close();
                return;
              }
              hasSavedBeforeLeave = true;

              if (window.isHnrc && self.returnUrl) {
                var returnUrl = decodeURIComponent(self.returnUrl);

                try {
                  window.parent.postMessage(
                    {
                      msg: "hideUlearning",
                    },
                    "*"
                  );
                } catch (error) {}

                window.location = returnUrl;
                return;
              }

              // 调用第三方平台的退出接口
              var callbackurl = getCookie("callbackurl");
              if (callbackurl[0] == '"' || callbackurl[0] == "'") {
                callbackurl = callbackurl.substring(1, callbackurl.length - 1);
              }
              callbackurl = callbackurl
                ? callbackurl
                : "http://www.hnpxw.org/learner/studyEnd.do";
              window.location.assign(
                CONFIG_LOGIN_HOST +
                  "/umooc/thirdparty/study.do?operation=logout&callbackurl=" +
                  encodeURIComponent(callbackurl) +
                  "&type=1&nodeID=" +
                  chapterId +
                  "&courseID=" +
                  courseId
              );
            } else {
              hasSavedBeforeLeave = true;
              // history.go(-1);
              if (isTeacherDevelopment || showExit) {
                window.close();
                return;
              }
              if (self.returnUrl) {
                window.location = decodeURIComponent(self.returnUrl);
                return;
              }
              if (window.opener) {
                window.close();
              } else {
                history.back();
              }
              // window.location.assign(
              //   CONFIG_LOGIN_HOST +
              //   "/umooc/learner/study.do?operation=studyReport&courseID=" +
              //   courseId
              // );
            }
          }
        }

        if (self.currentSection()) {
          if (!isPreviewMode && !isExpiredMode) {
            isSavingGoBack = true;
            $(".view-loader .save-tip").css({
              display: "block",
            });
            $(".view-loader").fadeIn();
            try {
              self.currentSection().createRecord(
                true,
                0,
                self.currentChapter().id(),
                function () {
                  $(".view-loader").fadeOut();
                  goBackCallback();
                  isSavingGoBack = false;
                },
                function (stillGoBack) {
                  if (stillGoBack) {
                    goBackCallback();
                  }
                  $(".view-loader").fadeOut();
                  isSavingGoBack = false;
                },
                true
              );
            } catch (e) {
              goBackCallback();
            }
          } else {
            goBackCallback();
          }
        } else {
          goBackCallback();
        }
      }
    };
    window.leavePlayer = self.goBack;
    self.refresh = function () {
      function refreshCallback() {
        hasSavedBeforeLeave = true;
        history.go(-0);
      }

      if (!isPreviewMode && !isExpiredMode) {
        try {
          self.currentSection().createRecord(
            true,
            0,
            self.currentChapter().id(),
            function () {
              refreshCallback();
            },
            function () {
              refreshCallback();
            }
          );
        } catch (e) {
          refreshCallback();
        }
      }
    };

    self.showCustomService = function () {
      // 初始化客服插件
      try {
        xn("setCustomerInfo", {
          uid: window.currentUserId,
          uname: window.currentUserName,
          exterinfo: {
            url: encodeURI(window.location.href),
            userAgent: encodeURI(window.navigator.userAgent),
          },
          system: "web",
        });

        // xn('setCallback', {
        //   type: 'loadUIScript',
        //   func: function() {
        //     NT_UI.setThemeColor({
        //       primaryColor: '#ea5947',
        //       secondaryColor: '#ea5947',
        //       tertiaryColor: '#ea5947',
        //       textColor: '#fff'
        //     })
        //   }
        // });

        setTimeout(function () {
          xn("openChat", "kf_20125_template_9999");
        }, 100);
      } catch (e) {}
    };

    self.course = course;
    // 当前激活的章节页
    self.currentPage = ko.observable();
    self.currentSection = ko.observable();
    self.currentChapter = ko.observable();
    // 上一页下一页
    self.prevPageFamily = ko.observable({});
    self.nextPageFamily = ko.observable({});
    self.prevPageName = ko.observable("");
    self.nextPageName = ko.observable("");
    // 章节统计页面
    self.sectionStatPage = ko.observable(false);
    self.chapterStatPage = ko.observable(false);
    // 章节学习进度
    self.sectionStatData = ko.observable({});
    self.chapterStatData = ko.observable({});
    self.chapterProgress = ko.observable(0);

    // 点击目录非页节点时的操作
    self.clickTreeNode = function (data, event) {
      if (data instanceof Chapter) {
        // $(".section-list:not(#chapter" + data.id() + " .section-list)").slideUp();
        // $("#chapter" + data.id() + " .section-list").slideDown();
        $("#chapter" + data.id() + " .section-list").slideToggle();

        // 第一次进入章时获取本章的学习记录和进度
        var chapter = data;
        getChapterPages(chapter);
      } else if (data instanceof Section) {
        // $(".page-list:not(#section" + data.id() + " .page-list)").slideUp();
        // $("#section" + data.id() + " .page-list").slideDown();
        $("#section" + data.id() + " .page-list").slideToggle();
      }
    };
    // 获取一章的页面详情
    var isLoadingChapterInfo = false;

    function getChapterPages(chapter) {
      if (!isPreviewMode && !chapter.isPageLoaded()) {
        if (isLoadingChapterInfo) {
          return;
        }
        isLoadingChapterInfo = true;
        chapter.reterieveChapterPages(
          function () {
            chapter.isPageLoaded(true);
            chapter.saveCurrentStudyChapter(courseId);
            getChapterRecord(chapter, function () {
              self.calculateChapterProgress();
            });
            isLoadingChapterInfo = false;
          },
          function () {
            isLoadingChapterInfo = false;
          }
        );
      }
    }
    // 获取一章的学习记录
    function getChapterRecord(chapter, callback) {
      var sectionNum = chapter.sections().length;
      var completeNum = 0;
      for (var i = 0; i < sectionNum; i++) {
        var section = chapter.sections()[i];
        if (!section.isRecordLoaded()) {
          getSectionRecord(section);
        } else {
          completeNum++;
          if (completeNum == sectionNum) {
            callback();
          }
        }
      }
      function getSectionRecord(section) {
        section.reterieveRecord(
          function () {
            completeNum++;
            if (completeNum == sectionNum) {
              callback();
            }
            if (!section.record().status()) {
              if (course.uncompletedNodes.indexOf(section.id()) == -1) {
                course.uncompletedNodes.push(section.id());
              }
            }
          },
          function () {
            completeNum++;
            if (completeNum == sectionNum) {
              callback();
            }
            if (course.uncompletedNodes.indexOf(section.id()) == -1) {
              course.uncompletedNodes.push(section.id());
            }
          }
        );
      }
    }

    // 判断是否可以离开
    var needCheckComplete = true;

    function canLeaveCurrentPage(callback) {
      if (needCheckComplete && self.currentPage()) {
        // 整理本页学习记录
        self.currentPage().getRecord();
        if (
          self.currentPage().hasQuestion &&
          self.currentPage().hasStarted &&
          self.currentPage().questionIncomplete
        ) {
          // 提示还有习题没有学完
          if (self.currentPage().isLimitTime) {
            self.modalType("incompleteTimeLimit");
          } else {
            self.modalType("incomplete");
          }

          self.alertModal.show(
            function () {},
            function () {
              needCheckComplete = false;
              callback();
            },
            function () {}
          );

          return false;
        }

        if (
          self.currentPage().hasOralItem &&
          self.currentPage().hasStarted &&
          self.currentPage().oralIncomplete
        ) {
          // 提示还有习题没有学完
          self.modalType("incompleteOralItem");
          self.alertModal.show(
            function () {},
            function () {
              needCheckComplete = false;
              callback();
            },
            function () {}
          );

          return false;
        }
      }

      return true;
    }
    // 标志下一页是否是统计页面
    var needSectionStat = false;
    var needChapterStat = false;
    // 点击目录页节点时的操作
    self.selectPage = function (page, section, chapter) {
      if (!page || self.currentPage() == page) {
        // 没有切换页面只隐藏统计面板
        $("#statModal").modal("hide");
        return;
      }
      if (
        !canLeaveCurrentPage(function () {
          self.selectPage(page, section, chapter);
        })
      ) {
        return;
      }
      if (
        window.appMode &&
        window.pageResourceMap &&
        !window.pageResourceMap[page.id()]
      ) {
        // 处理app中的离线资源
        window.CoursePlayer.course.initPage(
          page.relationId(),
          function (jsonString) {
            var downloadObj = JSON.parse(jsonString);
            window.pageResourceMap[page.id()] = downloadObj;

            self.selectPage(page, section, chapter);
          }
        );
        return;
      }
      if (mobileMode) {
        self.hideCatalog();
      }
      needCheckComplete = true;

      $("#statModal").modal("hide");
      self.loadFailed(false);

      // 处理树展开
      // self.clickTreeNode(chapter);
      // self.clickTreeNode(section);
      $("#chapter" + chapter.id() + " .section-list").slideDown();
      $("#section" + section.id() + " .page-list").slideDown();
      // 第一次进入章时获取本章的页面和学习记录
      getChapterPages(chapter);
      if (window.mobileMode && chapter != self.currentChapter()) {
        scrollToCatalogTop();
      }

      // 离开本节时保存学习记录
      function studyNewSection() {
        // 开始学习新的节
        if (self.isExpiredMode() != true) {
          if (section.canstudy) {
            return;
          }
        }
        section.init(function () {
          clearInterval(window.autoSaveTimer);
          self.modalType("stopLearning");

          self.alertModal.show(
            function () {},
            function () {},
            function () {
              self.goBack();
            }
          );
          $("#alertModal #currentTime").text(formatYYMMddHHmm(new Date()));

          $("#pageName").text(self.currentPage().name());
        });
      }
      if (
        !isPreviewMode &&
        !isExpiredMode &&
        section != self.currentSection()
      ) {
        if (self.currentSection()) {
          self.currentSection().createRecord(
            true,
            0,
            self.currentChapter().id(),
            function () {
              studyNewSection();
            },
            function () {
              studyNewSection();
            }
          );
          self.currentSection().stopHeartbeat();
        } else {
          studyNewSection();
        }
      } else {
        if (self.isExpiredMode() != true) {
          if (section.canstudy) {
            isExpiredMode = 2;
            self.isExpiredMode(isExpiredMode);
          } else {
            isExpiredMode = false;
            self.isExpiredMode(isExpiredMode);
          }
        }
        if (
          !isPreviewMode &&
          !isExpiredMode &&
          section != self.currentSection()
        ) {
          studyNewSection();
        }
      }

      // 整理本页学习记录，针对预览模式
      if (self.currentPage()) {
        self.currentPage().getRecord();
        self.currentPage().stopLearning();
        self.calculateChapterProgress();
      }

      // 记录当前状态
      self.currentPage(page);
      self.currentSection(section);
      self.currentChapter(chapter);
      if (self.isExpiredMode() != true) {
        if (section.canstudy) {
          isExpiredMode = 2;
          self.isExpiredMode(isExpiredMode);
        } else {
          isExpiredMode = false;
          self.isExpiredMode(isExpiredMode);
        }
      }
      if (window.mobileMode) {
        // 手机端保存当前学习页面，并加上翻页动画
        localStorage["courseId" + courseId + "chapterId" + chapter.id()] =
          page.id();
        localStorage["courseId" + courseId] = page.id();
        if (!$(".page-scroller").hasClass("active-left-to-right")) {
          $(".page-scroller").addClass("active-right-to-left");
          setTimeout(function () {
            $(".page-scroller").removeClass("active-right-to-left");
          }, 500);
        }
      }
      // 切换页面时滚动回到顶部
      scrollToPageTop();

      // 开始学习
      if (!isExpiredMode && !self.currentPage().isHide()) {
        self.currentPage().startLearning();
      }

      self.prevPageFamily(getPrevPage(page, section, chapter));
      self.nextPageFamily(getNextPage(page, section, chapter));
      self.prevPageName(
        self.prevPageFamily().page
          ? self.prevPageFamily().page.name()
          : i18nMessageText.noMore
      );
      self.nextPageName(
        self.nextPageFamily().page
          ? self.nextPageFamily().page.name()
          : i18nMessageText.noMore
      );

      // 隐藏统计页面
      self.sectionStatPage(false);
      self.chapterStatPage(false);
      needSectionStat = false;
      needChapterStat = false;
      // 判断是否要到统计界面
      if (page.sort == section.pages().length - 1) {
        if (
          section.sort == chapter.sections().length - 1 ||
          !self.nextPageFamily().page
        ) {
          needSectionStat = true;
          needChapterStat = true;
          // self.nextPageName(i18nMessageText.sectionSummary);
          self.nextPageName(i18nMessageText.chapterSummary);
        } else {
          // needSectionStat = true;
          // self.nextPageName(i18nMessageText.sectionSummary);
        }
      }

      // 加载页面
      if (page.isHide() || (isAuditionMode && !page.isAudition())) {
        return;
      }
      if (!page.isLoaded()) {
        if (!isPreviewMode) {
          chapter.reterieveChapterPages(
            function () {
              if (page != self.currentPage()) {
                page.isLoaded(false);
                return;
              }

              firstTimeVisiting(page, section);
            },
            function () {
              self.loadFailed(true);
            }
          );
        } else {
          if (!window.appMode) {
            page.reterievePage(
              isPreviewMode,
              isAuthorPreview,
              isAuditionMode,
              function () {
                if (page != self.currentPage()) {
                  page.isLoaded(false);
                  return;
                }

                firstTimeVisiting(page, section);
              },
              function () {
                self.loadFailed(true);
              }
            );
          } else {
            chapter.reterieveChapterPages(
              function () {
                if (page != self.currentPage()) {
                  page.isLoaded(false);
                  return;
                }

                firstTimeVisiting(page, section);
              },
              function () {
                self.loadFailed(true);
              }
            );
          }
        }
      } else {
        firstTimeVisiting(page, section);

        setTimeout(function () {
          page.showRecord();
        });
      }
    };

    // 用来判断是否需要显示用户引导和获取学习记录
    function firstTimeVisiting(page, section) {
      setTimeout(function () {
        $(".page-scroller").perfectScrollbar("update");
      }, 1000);
      if (page.isVisited()) {
        return;
      }
      // 判断是否需要显示用户引导
      var hasShowVideoGuide = false;
      for (var i = 0; i < page.pageElements().length; i++) {
        var pageElement = page.pageElements()[i];
        if (pageElement.type() == 6) {
          if (pageElement.answerTime()) {
            page.isLimitTime = true;

            // self.modalType("timeLimit");

            // function getCallback(pe) {
            //   return function() {
            //     pe.koModel.startQuizTimer();
            //   }
            // }

            // self.alertModal.show(function() {}, function() {}, getCallback(pageElement));
            // $("#alertModal .question-num .data").text(pageElement.questions().length);
            // $("#alertModal .question-time .data").text(formatSeconds(pageElement.answerTime(), true));
            pageElement.showLimitTimeMask = true;
          }
          // break;
        } else if (pageElement.type() == 4) {
          if (hasShowVideoGuide) {
            continue;
          }
          hasShowVideoGuide = true;
          showUserGuide("video");
          // break;
        } else if (pageElement.type() == 16) {
          setTimeout(function () {
            showUserGuide("oralenglish");
          }, 1000);
        }
      }

      if (!isPreviewMode) {
        // 学习模式才加载学习记录
        if (!section.isRecordLoaded()) {
          section.reterieveRecord(function () {
            page.adaptRecord(
              section.record() && section.record().pageRecordMap
                ? section.record().pageRecordMap[page.relationId()]
                : null
            );
          });
        } else {
          setTimeout(function () {
            page.adaptRecord(
              section.record() && section.record().pageRecordMap
                ? section.record().pageRecordMap[page.relationId()]
                : null
            );
          });
        }
      }

      page.isVisited(true);
    }

    // 上一页、下一页
    var lastPage;
    self.goPreviousPage = function () {
      $("#statModal").modal("hide");
      if (self.sectionStatPage()) {
        // self.goPreviousPage();
        // return;
        // self.currentPage(lastPage);
        if (!isExpiredMode && !self.currentPage().isHide()) {
          self.currentPage().startLearning();
        }
        self.currentPage().showRecord();

        self.sectionStatPage(false);
        needSectionStat = true;

        self.prevPageName(
          self.prevPageFamily().page
            ? self.prevPageFamily().page.name()
            : i18nMessageText.noMore
        );
        // self.nextPageName(i18nMessageText.sectionSummary);
        self.nextPageName(i18nMessageText.chapterSummary);
      } else if (self.chapterStatPage()) {
        needCheckComplete = false;
        self.chapterStatPage(false);
        self.sectionStatPage(true);
        needChapterStat = true;

        self.prevPageName(lastPage.name());
        self.nextPageName(i18nMessageText.chapterSummary);
      } else {
        if (window.mobileMode) {
          $(".page-scroller").addClass("active-left-to-right");
          setTimeout(function () {
            $(".page-scroller").removeClass("active-left-to-right");
          }, 500);
        }
        self.selectPage(
          self.prevPageFamily().page,
          self.prevPageFamily().section,
          self.prevPageFamily().chapter
        );
      }
    };
    self.goNextPage = function () {
      if (self.nextPageName() == i18nMessageText.noMore) {
        return;
      }
      if (
        !canLeaveCurrentPage(function () {
          self.goNextPage();
        })
      ) {
        return;
      }

      self.sectionStatPage(false);
      self.chapterStatPage(false);
      if (needSectionStat) {
        // 进入节统计
        needCheckComplete = false;
        if (self.currentPage()) {
          // 整理本页学习记录
          self.currentPage().getRecord();
          self.currentPage().stopLearning();
        }
        self.calculateSectionProgress();
        self.calculateChapterProgress();

        lastPage = self.currentPage();
        // self.currentPage(null);
        self.sectionStatPage(true);
        $("#statModal").modal({
          backdrop: "static",
          keyboard: false,
          show: true,
        });
        // 切换页面时滚动回到顶部
        scrollToPageTop();

        self.prevPageName(lastPage.name());
        self.nextPageName(
          self.nextPageFamily().page
            ? self.nextPageFamily().page.name()
            : i18nMessageText.noMore
        );
        if (needChapterStat) {
          self.nextPageName(i18nMessageText.chapterSummary);
        }
        needSectionStat = false;
        self.goNextPage();
        return;
      } else if (needChapterStat) {
        // 进入章统计
        needCheckComplete = false;
        // self.currentPage(null);
        self.chapterStatPage(true);
        if (!isPreviewMode && !isExpiredMode) {
          self
            .currentSection()
            .createRecord(true, 1, self.currentChapter().id());
        }
        $("#statModal").modal({
          backdrop: "static",
          keyboard: false,
          show: true,
        });
        // 切换页面时滚动回到顶部
        scrollToPageTop();

        if (!mobileMode) {
          setTimeout(function () {
            var wave = new Wave(
              $("#waveCanvas")[0],
              self.chapterProgress() / 100 + 0.1
            );
            wave.start();
          });
        } else {
          setTimeout(function () {
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();
            $(".stat-page").height(windowHeight * 0.8);
          });
        }

        // self.prevPageName(i18nMessageText.sectionSummary);
        self.prevPageName(lastPage.name());
        self.nextPageName(
          self.nextPageFamily().page
            ? self.nextPageFamily().page.name()
            : i18nMessageText.noMore
        );
        needChapterStat = false;
      } else {
        if (!self.nextPageFamily().page) {
          return;
        }
        self.selectPage(
          self.nextPageFamily().page,
          self.nextPageFamily().section,
          self.nextPageFamily().chapter
        );
      }
    };

    // 计算节学习进度
    self.calculateSectionProgress = function () {
      var sectionStatData = self.currentSection().calculateProgress();
      sectionStatData.totalStudyTime = formatSeconds(
        sectionStatData.totalStudyTime,
        true
      );

      self.sectionStatData(sectionStatData);
    };
    // 计算章学习进度
    self.calculateChapterProgress = function (chapter) {
      var chapterStatData;
      if (window.courseType == "xml") {
        chapterStatData = self.currentChapter().calculateProgressByPage();
      } else {
        chapterStatData = self.currentChapter().calculateProgressBySection();
      }
      chapterStatData.totalStudyTime = formatSeconds(
        chapterStatData.totalStudyTime,
        true
      );

      self.chapterStatData(chapterStatData);
      self.chapterProgress(self.chapterStatData().chapterProgress);
    };

    self.reviewSection = function () {
      var pageFamily = {
        page: self.currentSection().pages()[0],
        section: self.currentSection(),
        chapter: self.currentChapter(),
      };

      if (pageFamily.page == self.currentPage() || 1) {
        self.goPreviousPage();
      } else {
        self.selectPage(
          pageFamily.page,
          pageFamily.section,
          pageFamily.chapter
        );
      }
    };

    self.reviewChapter = function () {
      var pageFamily = getNextPage(
        {
          sort: -1,
        },
        self.currentChapter().sections()[0],
        self.currentChapter()
      );

      if (pageFamily.page == self.currentPage() || 1) {
        self.goPreviousPage();
        self.goPreviousPage();
      } else {
        self.selectPage(
          pageFamily.page,
          pageFamily.section,
          pageFamily.chapter
        );
      }
    };

    self.closeStatPage = function () {
      self.goPreviousPage();
      self.goPreviousPage();
    };

    function getPrevPage(page, section, chapter) {
      if (page.sort > 0) {
        page = section.pages()[page.sort - 1];
      } else {
        if (section.sort > 0) {
          section = chapter.sections()[section.sort - 1];
          if (section.pages().length == 0) {
            return getPrevPage(page, section, chapter);
          }
          page = section.pages()[section.pages().length - 1];
        } else {
          if (chapter.sort > 0) {
            chapter = course.chapters()[chapter.sort - 1];
            if (chapter.sections().length == 0) {
              return getPrevPage(page, section, chapter);
            }
            section = chapter.sections()[chapter.sections().length - 1];
            if (section.pages().length == 0) {
              return getPrevPage(page, section, chapter);
            }
            page = section.pages()[section.pages().length - 1];
          } else {
            page = null;
          }
        }
      }

      var pageFamily = {
        page: page,
        section: section,
        chapter: chapter,
      };
      return pageFamily;
    }

    function getNextPage(page, section, chapter) {
      if (page.sort < section.pages().length - 1) {
        page = section.pages()[page.sort + 1];
      } else {
        if (section.sort < chapter.sections().length - 1) {
          section = chapter.sections()[section.sort + 1];
          if (section.pages().length == 0) {
            return getNextPage(page, section, chapter);
          }
          page = section.pages()[0];
        } else {
          if (chapter.sort < course.chapters().length - 1) {
            chapter = course.chapters()[chapter.sort + 1];
            if (chapter.sections().length == 0) {
              return getNextPage(page, section, chapter);
            }
            section = chapter.sections()[0];
            if (section.pages().length == 0) {
              return getNextPage(page, section, chapter);
            }
            page = section.pages()[0];
          } else {
            page = null;
          }
        }
      }

      var pageFamily = {
        page: page,
        section: section,
        chapter: chapter,
      };
      return pageFamily;
    }

    function initNoStudyTimer() {
      var noStudyTimer;
      // 长时间离开页面或无动作时中断学习状态
      // if (!window.mobileMode) {
      var noAction = new NoAction(10 * 60 * 1000, function () {
        // 停止当前学习动作
        stopAllMedia();
        self.currentPage().stopLearning();

        if (!noStudyTimer) {
          noStudyTimer = new Timer();
          noStudyTimer.startTiming(function (second) {
            self.noStudyTime(formatSeconds(second, true));
          });
        } else {
          if (noStudyTimer.isTiming) {
            return;
          } else {
            noStudyTimer.reStartTiming();
            noStudyTimer.startTiming(function (second) {
              self.noStudyTime(formatSeconds(second, true));
            });
          }
        }

        self.modalType("suspend");

        self.alertModal.show(
          function () {},
          function () {},
          function () {
            if (!isExpiredMode && !self.currentPage().isHide()) {
              self.currentPage().startLearning();
            }
            noStudyTimer.stopTiming();
          }
        );
      });
      // }
    }

    // 滚动回到页面顶部
    function scrollToPageTop() {
      $(".page-scroller").animate({
        scrollTop: 0,
      });
    }
    // 滚动回到目录顶部
    function scrollToCatalogTop() {
      $(".catalog-list-scroller").animate({
        scrollTop: 0,
      });
    }

    self.isFullScreen = ko.observable(false);
    window.isFullScreen = self.isFullScreen;
    // 展开、收起目录
    self.toggleCatalog = function (data, event) {
      $(".hide-catalog-btn").toggleClass("effective");
      $(".course-title").toggleClass("pack-up");
      $(".catalog-col").toggleClass("pack-up");
      $(".page-col").toggleClass("full");

      if (window.mobileMode) {
        window.isFullScreen(!window.isFullScreen());
      }
    };
    self.hideCatalog = function (data, event) {
      $(".hide-catalog-btn").addClass("effective");
      $(".course-title").addClass("pack-up");
      $(".catalog-col").addClass("pack-up");
      $(".page-col").addClass("full");

      if (window.mobileMode) {
        window.isFullScreen(false);
      }
    };
    if (mobileMode) {
      self.hideCatalog();
    }

    self.hideWrapper = function () {
      $("#iRecorderWrapper").addClass("hide-wrapper");
    };

    self.isSplitTipChecked = ko.observable(false);
    self.toggleCheck = function () {
      self.isSplitTipChecked(!self.isSplitTipChecked());
    };

    self.getPageCount = function () {
      var currentIndex = 0;
      var total = 0;

      try {
        for (var i = 0; i < self.currentChapter().sections().length; i++) {
          var section = self.currentChapter().sections()[i];

          for (var j = 0; j < section.pages().length; j++) {
            total++;
            var page = section.pages()[j];

            if (self.currentPage() == page) {
              currentIndex = total;
            }
          }
        }
      } catch (e) {}

      return currentIndex + "/" + total;
    };

    // 展开、收起页头页脚
    // var timingTask;
    // $(".page-control-area").hover(
    //   function() {
    //     clearTimeout(timingTask);
    //     $(".page-control-area .operating-area").addClass("active");
    //     // $(".course-container").removeClass("full");
    //   },
    //   function() {
    //     timingTask = setTimeout(function() {
    //       $(".page-control-area .operating-area").removeClass("active");
    //       // $(".course-container").addClass("full");
    //     }, 1000);
    //   }
    // );

    $(".container-fluid").scroll(function () {
      $(".container-fluid").scrollTop(0);
    });

    /*aiPanel.Dialog.close();*/
    // 离开页面时同步保存学习记录
    var hasSavedBeforeLeave = false;
    if (!window.appMode) {
      $(window).on("unload", function () {
        if (hasSavedBeforeLeave) {
          hasSavedBeforeLeave = false;
          return true;
        }
        // 保存学习记录
        if (!isPreviewMode && !isExpiredMode) {
          self
            .currentSection()
            .createRecord(false, 1, self.currentChapter().id());
        }
      });
      $(window).on("beforeunload", function () {
        if (!hasSavedBeforeLeave) {
          // hasSavedBeforeLeave = true;
          // 保存学习记录
          if (!isPreviewMode && !isExpiredMode) {
            self
              .currentSection()
              .createRecord(false, 1, self.currentChapter().id());

            return "保存记录";
          }
        }
      });
    }

    var autoSaveTime = 5 * 60 * 1000;
    // var autoSaveTime = 1 * 20 * 1000;
    if (isWxMiniProgram) {
      autoSaveTime = 20 * 1000;
    }
    window.autoSaveTimer = setInterval(function () {
      // 测试 --------
      // console.log('定时保存学习记录', self.currentSection())
      // self.currentSection().createRecord(true, 1, self.currentChapter().id());
      // 测试结束 -------

      // 定时保存学习记录
      if (!isPreviewMode && !isExpiredMode) {
        console.log("定时保存学习记录", self.currentSection());
        self.currentSection().createRecord(true, 1, self.currentChapter().id());
      }
    }, autoSaveTime);

    self.userSaveRecord = function () {
      if (!isPreviewMode && !isExpiredMode) {
        self
          .currentSection()
          .createRecord(true, 1, self.currentChapter().id(), function () {
            showToast(self.i18nMsgText().savedSuccessfully, "success", 1000);
          });
      }
    };

    var inputOffsetTop = 0;
    $("body").on("click", "input, textarea", function () {
      inputOffsetTop = $(this).offset().top;
    });

    $(window).resize(function () {
      var currentWindowHeight = $(window).height();

      if (inputOffsetTop > currentWindowHeight - 100) {
        $(".page-scroller").animate({
          scrollTop: "+=" + (inputOffsetTop - currentWindowHeight + 100) + "px",
        });
      }
    });

    ko.components.register("page-component", {
      viewModel: {
        require: "../components/pageView/pageViewModel",
      },
      template: {
        require: "text!../components/pageView/pageView.html",
      },
    });
    ko.components.register("question-view-component", {
      viewModel: questionViewModel,
      template: questionViewTemplate,
    });
    ko.components.register("oralenglish-component", {
      viewModel: {
        require: "../components/oralenglishView/oralenglishViewModel",
      },
      template: {
        require: "text!../components/oralenglishView/oralenglishView.html",
      },
    });
    ko.components.register("question-element-component", {
      viewModel: questionElementViewModel,
      template: questionElementTemplate,
    });
    ko.components.register("performance-report-component", {
      viewModel: {
        require: "../components/performanceReport/performanceReportViewModel",
      },
      template: {
        require: "text!../components/performanceReport/performanceReport.html",
      },
    });

    ko.components.register("role-play-component", {
      viewModel: {
        require: "../components/rolePlay/rolePlayViewModel",
      },
      template: {
        require: "text!../components/rolePlay/rolePlay.html",
      },
    });
    ko.components.register("doc-player-component", {
      viewModel: {
        require: "../components/docPlayer/docPlayerViewModel",
      },
      template: {
        require: "text!../components/docPlayer/docPlayer.html",
      },
    });
  };
});
