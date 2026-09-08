function getCookie(c_name) {
  if (document.cookie.length > 0) {
    var c_start = document.cookie.indexOf(c_name + "=");
    if (c_start != -1) {
      c_start = c_start + c_name.length + 1;
      var c_end = document.cookie.indexOf(";", c_start);
      if (c_end == -1) c_end = document.cookie.length;
      return unescape(
        document.cookie
          .substring(c_start, c_end)
          .replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent),
      );
    }
  }
  return "";
}

let urlStyle = getCookie("urlStyle");
let baseHost = getCookie("baseHost");
let docHost = getCookie("docHost");

var host = location.host;
var isDev =
  host.indexOf("10.100.32.50") === 0 ||
  host.indexOf("192.168") === 0 ||
  host === "127.0.0.1" ||
  host.indexOf("localhost") === 0;

var isLocal = getCookie("urlStyle") === "2";
var protocol = isDev ? "https://" : window.location.protocol + "//";
// 通过地址获取域名
var hostDomain = isDev ? ".tongshike.cn" : host.substring(host.indexOf("."));

// cookie写入的域名
var hostname = location.hostname;
var COOKIE_DOMAIN = isDev
  ? hostname
  : hostname.substring(hostname.indexOf("."));

// 是否是测试环境
var isTest = hostDomain === ".tongshike.cn" || hostDomain === ".ulearning.app";

// 人民公开课和东莞理工的域名接口还是ulearning
hostDomain =
  host.indexOf("people") !== -1 || host.indexOf("ulearning.dgut.edu.cn") !== -1
    ? ".ulearning.cn"
    : hostDomain;

// 公共配置参数
var CLASSROOM_API_SERVER_HOST = protocol + "classroomapi" + hostDomain;
var API_SERVER_HOST = protocol + "courseapi" + hostDomain;
var UMOOC_SERVER_HOST = protocol + (baseHost ? baseHost : "www" + hostDomain);
var UMOOC_COOKIE_DOMAIN = COOKIE_DOMAIN;
var SELF_ORIGIN = protocol + "courseweb" + hostDomain;
var TOPIC_API_SERVER_HOST = UMOOC_SERVER_HOST + "/websiteManage/api"; // 专题管理的独立后台
var TOPIC_API_SERVER_HOSTS = UMOOC_SERVER_HOST + "/websiteManage/portal"; // 专题管理的独立后台

var UA_API_HOST = protocol + "api" + hostDomain;
var UA_WEB_HOST = protocol + "ua" + hostDomain;
var KG_API_HOST = protocol + "knowledgeapi" + hostDomain;
var KG_WEB_HOST = protocol + "kg" + hostDomain;
var MONITOR_API_HOST = protocol + "servermonitorapi" + hostDomain;
var AI_API_HOST = protocol + "cloudsearchapi" + hostDomain;

var DOCS_HOST = docHost ? protocol + docHost : "https://docs.ulearning.cn";
var DOCS_VIEW_URL =
  DOCS_HOST + "?ssl=" + (protocol.indexOf("https") === 0 ? 1 : 0);

var REPOSITORY_SERVER_HOST = protocol + "rsglapi" + hostDomain;
var SCREEN_HOST = protocol + "x" + hostDomain;
var EPORTFOLIO_API_HOST = protocol + "eportfolio" + hostDomain;

// 资源服务相关配置
var RESOURCE_SERVER_HOST = protocol + "uobs" + hostDomain + "/view";
var CONFIG_QINIU_DOWNLOAD_HOST = "https://download.ulearning.cn";
var CONVERT_SERVICE_HOST = "https://convert.ulearning.cn";
var CONFIG_QINIU_BASE64_URL = protocol + "uobs" + hostDomain;
var UPLOAD_SERVER_HOST = "uobs" + hostDomain;
var UPLOAD_SERVER_PROTOCOL = protocol.indexOf("https") === 0 ? "https" : "http";
// 静态资源
var STATIC_SERVER_HOST = !isTest
  ? "https://static.ulearning.cn/static/course_web"
  : "";

// 录播相关api
var API_SERVER_HOST_SCA =
  protocol +
  (isTest ? "smartclassroomadminapi" : "democlassroomapi") +
  hostDomain;
var API_SERVER_HOST_URL =
  protocol + (isTest ? "smartclassroomadmin" : "classroom") + hostDomain;
// 智慧课堂新api
var CLASSROOM_URL = protocol + "smartclassroom" + hostDomain;
var CLASSROOM_SERVER_HOST = protocol + "classroomapi" + hostDomain;
var SOURCE_SERVER_HOST = protocol + "rm" + hostDomain;
var KOUYU_WEB_HOST = protocol + "kouyu" + hostDomain;
// 资源库域名
var ZYK_WEB_HOST = protocol + "zykapi" + hostDomain;
var ZYK_WEB = protocol + "zyk" + hostDomain;
var ZYK_NEW_WEB = isTest ? ZYK_WEB : "https://zyk.moocpeople.cn";

var APP_SERVER_HOST = protocol + "apps" + hostDomain;
var UA_HOST = UA_WEB_HOST;
var UTEST_WEB_HOST = protocol + "utest" + hostDomain;
var UTEST_API_HOST = protocol + "utestapi" + hostDomain;

var QINIU_BASE64_URL = CONFIG_QINIU_BASE64_URL;

// 作业
var HOMEWORK_WEB_HOST = protocol + "homework" + hostDomain;
var GROUPWORK_WEB_HOST = protocol + "homework" + hostDomain + "/groupwork";
var QUIZ_WEB_HOST = protocol + "homework" + hostDomain + "/quiz";
var HOMEWORK_API_HOST = protocol + "homeworkapi" + hostDomain;

var DISCUSSION_WEB_HOST = protocol + "discussion" + hostDomain;

var UMOOC_WEB_HOST = protocol + "umooc" + hostDomain;

var UMOBILE_WEB_HOST = protocol + "umobile" + hostDomain;
var MOBILE_WEB_HOST = protocol + "umobile" + hostDomain + "/mobile";
var APPLICATION_WEB_HOST = protocol + "app" + hostDomain;
var AI_ADMIN_WEB_HOST = protocol + "ai" + hostDomain;
var AI_WEB_HOST = AI_ADMIN_WEB_HOST + "/assistant";
var SJJX_WEB_HOST = protocol + "sjjx" + hostDomain;
var VLAB_WEB_HOST = protocol + "vlab" + hostDomain;

// 雷课堂
var ITEST_WEB_HOST = isTest
  ? protocol + "itest" + hostDomain
  : "https://www.leiketang.cn";
if (urlStyle && urlStyle == "2") {
  // 判断是否存在baseHost字段
  // 存在baseHost字段，则使用baseHost字段，不存在就使用host
  if (!baseHost) baseHost = window.location.host;
  // 公共配置参数
  API_SERVER_HOST = protocol + baseHost + "/courseapi";
  UMOOC_SERVER_HOST = protocol + baseHost;
  UMOOC_COOKIE_DOMAIN = COOKIE_DOMAIN;
  SELF_ORIGIN = protocol + baseHost;
  TOPIC_API_SERVER_HOST = UMOOC_SERVER_HOST + "/websiteManage/api"; // 专题管理的独立后台
  TOPIC_API_SERVER_HOSTS = UMOOC_SERVER_HOST + "/websiteManage/portal"; // 专题管理的独立后台

  UA_API_HOST = protocol + "ua" + hostDomain + "/uaapi";
  UA_WEB_HOST = protocol + "ua" + hostDomain;
  KG_API_HOST = protocol + baseHost + "/knowledgeapi";
  KG_WEB_HOST = protocol + baseHost + "/knowledge";
  MONITOR_API_HOST = protocol + baseHost + "/servermonitorapi";

  // DOCS_HOST = protocol + "docs.ulearning.cn";
  // DOCS_VIEW_URL =
  //   DOCS_HOST + "?ssl=" + (protocol.indexOf("https") === 0 ? 1 : 0);

  REPOSITORY_SERVER_HOST = protocol + "rsglapi" + baseHost;
  SCREEN_HOST = protocol + "x" + hostDomain;
  EPORTFOLIO_API_HOST = protocol + "eportfolio" + baseHost;

  // 资源服务相关配置
  if (location.host.indexOf("dgut") === -1) {
    RESOURCE_SERVER_HOST = protocol + baseHost + "/uobs/view";
    CONFIG_QINIU_BASE64_URL = protocol + baseHost + "/uobs";
    UPLOAD_SERVER_HOST = baseHost + "/uobs";
  }
  

  CONFIG_QINIU_DOWNLOAD_HOST = protocol + "download" + baseHost;
  CONVERT_SERVICE_HOST = protocol + "convert" + baseHost;
  
  UPLOAD_SERVER_PROTOCOL = protocol.indexOf("https") === 0 ? "https" : "http";
  // 静态资源
  STATIC_SERVER_HOST = protocol + baseHost + "/static/course_web";
  UMOOC_STATIC_HOST = protocol + baseHost + "/static";

  // 录播相关api
  API_SERVER_HOST_SCA = protocol + "lubo" + baseHost + "/api";
  API_SERVER_HOST_URL = protocol + "lubo" + baseHost;
  // 智慧课堂新api
  CLASSROOM_URL = protocol + baseHost + "/classroom";
  CLASSROOM_SERVER_HOST = protocol + baseHost + "/classroomapi";
  SOURCE_SERVER_HOST = protocol + "rm" + hostDomain;
  KOUYU_WEB_HOST = protocol + baseHost + "/kouyu";
  // 资源库域名
  ZYK_WEB_HOST = protocol + "zykapi" + hostDomain;
  ZYK_WEB = protocol + "zyk" + hostDomain;
  ZYK_NEW_WEB = isTest ? ZYK_WEB : "https://zyk.moocpeople.cn";

  APP_SERVER_HOST = protocol + baseHost + "/mobileapi";
  UA_HOST = UA_WEB_HOST;
  UTEST_WEB_HOST = protocol + baseHost + "/utest";
  UTEST_API_HOST = protocol + baseHost + "/utestapi";

  QINIU_BASE64_URL = CONFIG_QINIU_BASE64_URL;

  // 作业
  HOMEWORK_WEB_HOST = protocol + baseHost + "/homework";
  GROUPWORK_WEB_HOST = protocol + baseHost + "/homework/groupwork";
  QUIZ_WEB_HOST = protocol + baseHost + "/homework/quiz";
  HOMEWORK_API_HOST = protocol + baseHost + "/homeworkapi";

  DISCUSSION_WEB_HOST = protocol + baseHost + "/discussion";

  UMOOC_WEB_HOST = protocol + baseHost + "/mooc";

  UMOBILE_WEB_HOST = protocol + baseHost + "/mobile";
  MOBILE_WEB_HOST = protocol + baseHost + "/newmobile";
  APPLICATION_WEB_HOST = protocol + baseHost + "/application";
  AI_ADMIN_WEB_HOST = protocol + "aijx" + hostDomain;
  AI_WEB_HOST = AI_ADMIN_WEB_HOST + "/ai";
  AI_API_HOST = protocol + "aijx" + hostDomain + "/api";
  SJJX_WEB_HOST = protocol + "sjjx" + baseHost;
  VLAB_WEB_HOST = UMOOC_WEB_HOST; // protocol + 'vlab' + hostDomain
  // 雷课堂
  ITEST_WEB_HOST = isTest
    ? protocol + "itest" + baseHost
    : "https://www.leiketang.cn";

  // 定制门户地址
  SUBSITE_WEB_HOST = "";
  // local需要修改
}
var speicalLocalArr = [".nxu.edu.cn"];
if (speicalLocalArr.indexOf(hostDomain) != -1) {
  // 宁大特殊处理
  if (hostDomain == speicalLocalArr[0]) {
    AI_ADMIN_WEB_HOST = protocol + "ulearning" + hostDomain + "/aiManage";
    AI_WEB_HOST = protocol + "ulearning" + hostDomain + "/ai";
  }
}


// 定制门户地址
var SUBSITE_WEB_HOST = "";

// 业务配置
var isZambia = /zambialearning\.net$/.test(location.hostname);
var HNYLBK_ORGS = [
  9495, 2943, 2965, 2955, 2967, 2951, 2945, 2949, 2983, 2941, 5212, 9380, 2969,
  2963, 2985, 2953, 2957, 2973, 2977, 2979, 2981, 2971, 2975, 3003, 2991, 2999,
  3005, 3009, 2959, 9305, 3041, 2987, 2989, 2997, 3001, 2993, 3015, 2995, 9258,
  3007, 3011, 3013, 3027, 3021, 3023, 9503, 3019, 3017, 9319, 7451, 8815, 9200,
  3185, 3191, 3193, 3195, 3187, 5226, 9506, 9504, 9502, 9501, 9505, 9445, 9507,
];
var asiaVersion = false;
var IS_NEW_QUIZ = true;
// local需要修改
