requirejs.config({
  baseUrl: "js",
  urlArgs: "version=250114",
  paths: {
    // "jquery": "//cdnjs.cloudflare.com/ajax/libs/jquery/1.12.4/jquery.min",
    knockout: "../3rdlib/knockout-3.4.2/knockout-min",
    domReady: "../3rdlib/require/domReady.min",
    text: "../3rdlib/require/text.min",
    css: "../3rdlib/require/css.min",
    i18n: "../locales",
    "ko-i18n": "../common/ko-i18n",
    CryptoJS: "../3rdlib/crypto-js-3.1.9/crypto-js.min",
    jweixin: [
      "https://res.wx.qq.com/open/js/jweixin-1.4.0",
      "https://res2.wx.qq.com/open/js/jweixin-1.4.0",
    ],
  },
});

require([
  "knockout",
  "learnCourseViewModel",
  "domReady",
  "ko-i18n",
  "css!../components/customAudio/customAudio.css",
  "css!../css/main.css",
  "css!../css/learnCourse.css",
  "css!../components/pageView/pageView.css",
  "css!../components/questionView/questionView.css",
  "css!../components/questionElementView/questionElementView.css",
  "css!../components/rolePlay/rolePlay.css",
  "css!../components/docPlayer/docPlayer.css",
  "css!../components/oralenglishView/oralenglishView.css",
  "css!../components/performanceReport/performanceReport.css",
], function (ko, learnCourseViewModel, domReady) {
  domReady(function () {
    window.debugMode = false;
    // 判断是否是手机模式
    window.mobileMode = navigator.userAgent.indexOf("Mobile") != -1;
    // if ($(window).width() < 768) {
    //   window.mobileMode = true;
    //   // CONFIG_API_HOST = "./stub";
    // } else {
    //   window.mobileMode = false;
    //   // CONFIG_API_HOST = "./stub";
    // }
    window.appMode = window.mobileMode; //否在app内部
    if (navigator.userAgent.indexOf("umoocApp") == -1) {
      window.appMode = false;
    } else {
      // 处理大屏平板在app中学习的情况
      window.appMode = true;
      window.mobileMode = true;
    }

    if (window.appMode) {
      // clearInterval(refreshSessionTimer);

      var initTimer = setInterval(function () {
        // console.log("init timer");
        if (window.appPluginReady) {
          clearInterval(initTimer);

          var hasInited = false;

          function getUserInfo() {
            if (hasInited) {
              return;
            }
            hasInited = true;
            window.ULplugin.User.getUser(function (jsonString) {
              try {
                jsonString = JSON.parse(jsonString);
              } catch (e) {}

              window.currentUserId = jsonString.userID;
              window.AUTHORIZATION = jsonString.token;
              init();
            });
          }

          try {
            window.ULplugin.UApp.getConfigInfo(
              function (jsonString) {
                try {
                  jsonString = JSON.parse(jsonString);
                } catch (e) {}

                if (jsonString.domain != "tongshike.cn") {
                  var i18nHost = "." + jsonString.domain;
                  var i18nDomain = jsonString.domain.substring(
                    jsonString.domain.lastIndexOf(".") + 1
                  );
                  CONFIG_API_HOST = "https://api" + i18nHost;
                  API_SERVER_HOST = "https://courseapi" + i18nHost;
                  ROOT_ORIGIN =
                    ROOT_ORIGIN != "null" && ROOT_ORIGIN != "undefined"
                      ? ROOT_ORIGIN
                      : "https://www" + i18nHost;
                  DOCS_HOST = "https://docs" + i18nHost;
                  MATHJAX_HOST = "https://static" + i18nHost + "/static";

                  if (jsonString.domain != "ulearning.cn") {
                    CONFIG_QINIU_RESOURCE_URL =
                      "https://" + i18nDomain + "-obs" + i18nHost + "/";
                    window.isI18n = true;
                  }
                  UMOOC_STATIC_HOST = "https://static" + i18nHost + "/static";
                  if (jsonString.domain.indexOf("dgut") != -1) {
                    // 独立部署的项目
                    i18nHost = jsonString.domain.substring(
                      jsonString.domain.indexOf(".")
                    );
                    // 非saas站点
                    CONFIG_API_HOST = "https://ua.dgut.edu.cn/uaapi";
                    API_SERVER_HOST =
                      "https://" + jsonString.domain + "/courseapi";
                    ROOT_ORIGIN =
                      ROOT_ORIGIN != "null" && ROOT_ORIGIN != "undefined"
                        ? ROOT_ORIGIN
                        : "https://" + jsonString.domain;
                    DOCS_HOST = "https://docs.ulearning.cn";
                    MATHJAX_HOST = "https://lms.dgut.edu.cn/static";
                    CONFIG_QINIU_RESOURCE_URL =
                      "https://" + jsonString.domain + "/uobs";
                    UMOOC_STATIC_HOST =
                      "https://" + jsonString.domain + "/static";
                    window.isI18n = true;
                  }
                }

                getUserInfo();
              },
              function () {
                getUserInfo();
              }
            );

            setTimeout(function () {
              if (!hasInited) {
                getUserInfo();
              }
            }, 2000);
          } catch (error) {
            getUserInfo();
          }

          window.onReloadUserInfo = function () {
            window.ULplugin.User.getUser(function (jsonString) {
              try {
                jsonString = JSON.parse(jsonString);
              } catch (e) {}

              window.currentUserId = jsonString.userID;
              window.AUTHORIZATION = jsonString.token;
            });
          };
        }
      }, 10);
    } else {
      var token = getUrlParam("token");

      if (token) {
        require(["CryptoJS"], function (CryptoJS) {
          var token = getUrlParam("token");
          try {
            token = CryptoJS.enc.Utf8.stringify(
              CryptoJS.enc.Base64.parse(token)
            );
          } catch (e) {
            console.log(e);
          }

          var domain = "";
          if (location.host.indexOf(".tongshike.cn") != -1) {
            domain = ".tongshike.cn";
          } else if (location.hostname.indexOf("ulearning") != -1) {
            domain = location.hostname.substring(
              location.hostname.indexOf(".")
            );
          }
          setCookie("token", -1, -1, "/");
          setCookie("token", -1, -1, "/", domain);
          setCookie("token", token, null, "/", domain);
          init();
        });
      } else {
        init();
      }
    }

    function init() {
      try {
        MathJax.Hub.Config({
          tex2jax: {
            inlineMath: [["\\(", "\\)"]],
            displayMath: [["\\[", "\\]"]],
            processEscapes: true,
            skipTags: [
              "script",
              "noscript",
              "style",
              "textarea",
              "pre",
              "code",
            ],
          },
          TeX: {
            extensions: ["mhchem.js", "extpfeil.js", "mediawiki-texvc.js"],
          },
        });
      } catch (e) {}

      window.koLearnCourseViewModel = new learnCourseViewModel();
      ko.applyBindings(koLearnCourseViewModel);

      window.addOrgToUrl = function (url, paramName, value) {
        //url字符串添加参数
        //url:路径地址 paramName：参数名 value
        if (url.indexOf(paramName) > -1) {
          var re = eval("/(" + paramName + "=)([^&]*)/gi");
          url = url.replace(re, paramName + "=" + value);
        } else {
          var paraStr = paramName + "=" + value;

          var idx = url.indexOf("?");
          if (idx < 0) url += "?";
          else if (idx >= 0 && idx != url.length - 1) url += "&";
          url = url + paraStr;
        }
        return url;
      };

      //替换资源的路径
      window.buildResourcePath = function (src) {
        var httpReg = /^(http|https|file|cdvfile)/;
        if (httpReg.test(src)) {
          src = src.replace(
            "http://leicloud.ulearning.cn/",
            CONFIG_QINIU_RESOURCE_URL
          );
          src = src.replace(
            "http://leicloud.qiniudn.com/",
            CONFIG_QINIU_RESOURCE_URL
          );
          src = src.replace(
            "https://tskcloud.ulearning.cn/",
            CONFIG_QINIU_RESOURCE_URL
          );
        } else {
          src = CONFIG_QINIU_RESOURCE_URL + src;
        }
        src = addOrgToUrl(src, "token", window.AUTHORIZATION);
        return src;
      };

      // 停止所有播放的媒体
      window.stopAllMedia = function (rootDom, type, current) {
        if (!rootDom) {
          rootDom = $("body");
        }
        if (!type || type == "audio") {
          // 暂停所有音频
          // var videoInstances = rootDom.find("audio");
          // for (var i = 0; i < videoInstances.length; i++) {
          //   var video = videoInstances.eq(i);
          //   if (video[0] != current) {
          //     video[0].pause();
          //   }
          // }
        }

        if (!type || type == "video") {
          // 暂停所有视频
          var videoInstances = rootDom.find("video");
          for (var i = 0; i < videoInstances.length; i++) {
            var video = videoInstances.eq(i);
            if (video[0] != current) {
              video[0].pause();
              document.webkitExitFullscreen();
            }
          }
        }
      };
      if (!Array.isArray) {
        Array.isArray = function (arg) {
          return Object.prototype.toString.call(arg) === "[object Array]";
        };
      }
      // 弹出提示
      window.showToast = function (msg, type, time) {
        var icon = "";
        switch (type) {
          case "success":
            icon = "icon-xuanzhong";
            break;
          case "warning":
            icon = "icon-tishi";
            break;
          default:
        }
        time = time || 2000;
        var toastTpl =
          '<div class="toast-content"><div class="toast ' +
          type +
          '"><span><i class="iconfont ' +
          icon +
          '"></i>' +
          msg +
          "</span></div></div>";
        $body = $("body");
        $body.append(toastTpl);
        $(".toast-content .toast").addClass("show");
        setTimeout(function () {
          $(".toast-content").remove();
        }, time);
      };
    }
  });
});
