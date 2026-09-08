// var locale = null;
// var query = location.href.split("#")[0].split("?")[1];
// var match = query && query.match(/locale=([\w-]+)/);
// if (match) {
//   locale = match[1];
// }

var lang = getUrlParam("lang");
var locale = lang ? lang : getCookie("lang");
var token = getHashParam("token");
if (token) {
  setCookie("AUTHORIZATION", token, null, "/", UMOOC_COOKIE_DOMAIN);
}

document.documentElement.setAttribute("dir", "ltr");

if (locale == "en") {
  document.body.classList.add("i18n-english");
  document.documentElement.setAttribute("lang", "en-US");
  document.documentElement.setAttribute("dir", "ltr");
} else if (locale == "id") {
  document.body.classList.add("i18n-english");
  document.body.classList.add("i18n-indonesia");
  document.documentElement.setAttribute("lang", "id-ID");
  document.documentElement.setAttribute("dir", "ltr");
} else if (locale === "es") {
  document.body.classList.add("i18n-english");
  document.body.classList.add("i18n-espanol");
  document.documentElement.setAttribute("lang", "es-ES");
  document.documentElement.setAttribute("dir", "ltr");
} else if (locale === "th") {
  document.body.classList.add("i18n-english");
  document.body.classList.add("i18n-thai");
  document.documentElement.setAttribute("lang", "th-TH");
  document.documentElement.setAttribute("dir", "ltr");
} else if (locale === "ar") {
  document.body.classList.add("i18n-ar");
  document.documentElement.setAttribute("lang", "ar-EG");
  document.documentElement.setAttribute("dir", "rtl");
} else if (locale === "tw") {
  document.body.classList.add("i18n-tw");
  document.documentElement.setAttribute("lang", "zh-TW");
  document.documentElement.setAttribute("dir", "ltr");
} else if (locale === "fr") {
  document.body.classList.add("i18n-fr");
  document.documentElement.setAttribute("lang", "fr");
  document.documentElement.setAttribute("dir", "ltr");
} else {
  document.body.classList.remove("i18n-english");
  document.body.classList.remove("i18n-indonesia");
  document.body.classList.remove("i18n-espanol");
  document.body.classList.remove("i18n-thai");
}

var userInfo = getCookie("USER_INFO");
if (userInfo) {
  userInfo = JSON.parse(userInfo);
  if (HNYLBK_ORGS.indexOf(userInfo.orgId) > -1) {
    $("body").addClass("hnylbk");
    window.hnylbk = true;
  }
}

var urlStyle_resource = getCookie("urlStyle");

var baseUrl = "";

requirejs.config({
  config: {
    i18n: {
      locale: locale,
    },
  },
  baseUrl: baseUrl,
  waitSeconds: 0,
  urlArgs: "version=1.4.44",
  packages: [
    {
      name: "highcharts",
      main: "highcharts",
    },
  ],
  paths: {
    domReady: "../common/vendor/require-domReady-2.0.1/domReady.min",
    text: "../common/vendor/require-text-2.0.12/text.min",
    knockout: "../common/vendor/knockout-3.4.2/knockout-min",
    director: "../common/vendor/director-1.2.8/director.min",
    i18n: "../common/vendor/require-i18n-2.0.6/i18n.min",
    nls: "../common/nls",
    mediaelement:
      "../common/vendor/mediaelement-4.2.9/mediaelement-and-player.min",
    tween: "../common/vendor/tween/TweenMax",

    koView: "../common/component/koView",
    uploader: "../common/component/uploader/uploader",
    fileSelector: "../common/component/fileSelector/fileSelector",
    base64: "../common/component/base64",
    Dialog: "../common/component/dialog/Dialog",
    Toast: "../common/component/toast/Toast",
    Loading: "../common/component/loading/loading",
    ClassSelector: "../common/component/class-selector/index",
    Recorder: "../common/vendor/recorder-core/src/recorder-core",
    Recorder_min: "../common/vendor/recorder-core/recorder.mp3.min",
    Recorder_mp3: "../common/vendor/recorder-core/src/engine/mp3",
    Recorder_mp3_engine: "../common/vendor/recorder-core/src/engine/mp3-engine",
    JqueryUi: "../common/vendor/jquery-ui-1.12.1/jquery-ui.min",
    JqueryMessage: "../common/vendor/jquery-validate-1.17.0/messages_zh.min",
    JqueryValidatorUserExtend:
      "../common/vendor/jquery-validate-1.17.0/jquery.validate.userextend",

    CustomAudio: "./component/customAudio/customAudio",
    uPaint: "../common/component/uPaint",
    highcharts: "../common/vendor/highcharts-9.1.0",
    echarts: "../common/vendor/echarts/echarts.min",

    Unit: "./model/Unit",
    Course: "./model/Course",
    Activity: "./model/Activity",
    Resource: "./model/Resource",
    StudyRecord: "./model/StudyRecord",
    Doc: "./model/Doc",
    VideoRecord: "./model/VideoRecord",
    User: "./model/User",
    Eportfolio: "./model/Eportfolio",
    Covers: "./model/Covers",
    Portal: "./model/Portal",
    Topic: "./model/Topic",
    Class: "./model/Class",
    Strategy: "./model/Strategy",
    Announcement: "./model/Announcement",
    Units: "./model/Units",
    Knowledge: "./model/Knowledge",
    Textbook: "./model/Textbook",
    Uploader: "./tool/Uploader",
    Login: "./module/user/component/login/Login",
    MoocLogin: "../publicCourse/module/user/component/login/Login",
    Classroom: "./model/Classroom",
    Live: "./model/Live",
    Discussion: "./model/Discussion",
    Order: "./model/Order",
    Homework: "./model/Homework",
    Paper: "./model/Paper",
    Exam: "./model/Exam",
    ExamRoom: "./model/ExamRoom",
    RandomPaper: "./model/RandomPaper",
    SPOCResource: "./model/SPOCResource",
    Live: "./model/Live",
    ClassGroup: "./model/ClassGroup",
    Semester: "./model/Semester",
    Certificate: "./model/Certificate",
    MicroCourse: "./model/MicroCourse",
    MicroCoursePage: "./model/MicroCoursePage",
    ObeActivity: "./model/ObeActivity",
    ckeditor: "../common/vendor/ckeditor/ckeditor",
    pdf: "../common/vendor/pdf.js/build/pdf",
    "ua-parser-js": "../common/vendor/UAParser-0.7.20/ua-parser.min",
    swfobject: "../common/vendor/swfobject-2.2/swfobject.min",
    _17kouyu: "https://sdk.17kouyu.com/jssdk/v4.1/iload",
    "@fullcalendar/core": "../common/vendor/fullcalendar-4.4.0/core/main.min",
    "@fullcalendar/interaction":
      "../common/vendor/fullcalendar-4.4.0/interaction/main.min",
    "@fullcalendar/daygrid":
      "../common/vendor/fullcalendar-4.4.0/daygrid/main.min",
    "@fullcalendar/list": "../common/vendor/fullcalendar-4.4.0/list/main.min",
    "@fullcalendar/timegrid":
      "../common/vendor/fullcalendar-4.4.0/timegrid/main.min",
    util: "../common/js/util",
    Obs: "../common/vendor/ulearning-obs/obs-qiniu"
  },
  map: {
    "*": {
      cssLoader: "../common/vendor/require-css-0.1.10/require-css.min.js",
    },
  },
});

require([
  "require",
  "knockout",
  "User",
  "Toast",
  "Obs",
  "domReady!",
  "./mainController.js",
], function (require, ko, User, Toast, Obs) {
  window.Obs = Obs;
  window.Authorization = getCookie("AUTHORIZATION");
  // window.Authorization = "8F21BC1A82E313A7499496061B33B88B";

  jQuery.support.cors = true;
  var browser = BrowserType();
  if (browser == "IE9" || browser == "IE8") {
    API_SERVER_HOST = API_SERVER_HOST.replace("https", "http");
  }
  $.ajaxSetup({
    beforeSend: function (xhr, info) {
      // office365的接口 后面不需要拼接参数 不需要配置请求头
      if (info.url.indexOf("doc") > -1) {
        return;
      }
      if (info.url.indexOf(CONVERT_SERVICE_HOST) == -1) {
        if (!(info.contentType === false)) {
          xhr.setRequestHeader("Content-Type", "application/json");
        }
        xhr.setRequestHeader("Authorization", Authorization);
        xhr.setRequestHeader("version", 1);
      }
      if (info.url.indexOf(UA_API_HOST) > -1) {
        var token = getCookie("token");
        xhr.setRequestHeader("UA-AUTHORIZATION", token);
      }

      //REVIEW_TEACHERID 免登陆模式 免登陆教师页面（会携带用户信息写入后台写入cookie） 携带指定header给后台权限判断
      var REVIEW_TEACHERID = getCookie("REVIEW_TEACHERID"); //免登陆访问的用户id
      if (Authorization == "REVIEW_TEACHER_TOKEN" && REVIEW_TEACHERID) {
        xhr.setRequestHeader("REVIEW_TEACHERID", REVIEW_TEACHERID);
      }

      // 低版本ie处理(ie8,9无法在请求中添加自定义header)
      var browser = BrowserType();
      var url = this.url;
      if (browser == "IE9" || browser == "IE8") {
        if (url.indexOf("?") == -1) {
          url += "?timestamp=" + Authorization;
        } else {
          url += "&timestamp=" + Authorization;
        }

        url += "&time=" + new Date();
        url += "&lang=" + locale;
      } else {
        if (url.indexOf("?") == -1) {
          url += "?lang=" + locale;
        } else {
          url += "&lang=" + locale;
        }
      }
      this.url = url;
    },
    complete: function (xhr, status) {
      try {
        xhr.responseJSON = JSON.parse(xhr.responseText);
      } catch (e) {}
      if (xhr.status == 401) {
        // return
        if (
          xhr.responseJSON.code == 2001 ||
          xhr.responseJSON.code == 2101 ||
          xhr.responseJSON.code == 2201
        ) {
          // window.sessionStorage.setItem('loginRedirectUrl',location.href)
          setCookie(
            "loginRedirectUrl",
            location.href,
            null,
            "/",
            UMOOC_COOKIE_DOMAIN
          );
          window.location = "/ulearning/tip/timeout.html";
        }
        // var toast = new Toast();
        // toast.show({
        //   type: "warning",
        //   message: "token已过期，请重新登录",
        //   time: 1500
        // });
      } else if (xhr.status == 403) {
        var toast = new Toast();
        toast.show({
          type: "warning",
          message: xhr.responseJSON.message,
          time: 1500,
        });
      }
    },
  });
  if (window.Authorization) {
    var user = new User();
    user.judgeToken();
  }

  var mainController = require("./mainController.js");

  ko.applyBindings(new mainController());
});
