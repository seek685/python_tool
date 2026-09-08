var urlStyle = getCookie("urlStyle");
var baseHost = getCookie("baseHost");
var docHost = getCookie("docHost");

// 通过地址获取域名
var host = location.host;
var isDev =
  host.indexOf("192.168") === 0 ||
  host === "127.0.0.1" ||
  host.indexOf("localhost") === 0 ||
  location.href.indexOf("file://") > -1;
var protocol = isDev ? "https://" : location.protocol + "//";
//host 携带端口
var hostDomain = isDev ? ".tongshike.cn" : host.substring(host.indexOf("."));

// cookie写入的域名 hostname 不带端口
var hostname = location.hostname;
var COOKIE_DOMAIN = isDev
  ? hostname
  : hostname.substring(hostname.indexOf("."));

// 是否是测试环境
var isTest = hostDomain === ".tongshike.cn";

window.isI18n = false;

//公共配置参数
var CONFIG_API_HOST = protocol + "api" + hostDomain; // 后台接口地址
var API_SERVER_HOST = protocol + "courseapi" + hostDomain;
var KG_WEB_HOST = protocol + "kg" + hostDomain;
var UMOOC_HOST = protocol + "www" + hostDomain; // 优学院

//资源服务
var CONFIG_QINIU_RESOURCE_URL = "https://leicloud.ulearning.cn/";
var CONFIG_QINIU_MEDIA_URL = CONFIG_QINIU_RESOURCE_URL;
var UPLOAD_SERVER_HOST = "";
var UPLOAD_SERVER_PROTOCOL = protocol.indexOf("https") === 0 ? "https" : "http";

//文档服务
var DOCS_HOST = docHost ? protocol + docHost : "https://docs.ulearning.cn";

//静态资源
var UMOOC_STATIC_HOST = isTest
  ? "https://www.tongshike.cn/"
  : "https://static.ulearning.cn/";

var MATHJAX_HOST = UMOOC_STATIC_HOST + "static";

var ROOT_ORIGIN = decodeURIComponent(getCookie("ROOT_ORIGIN"));
ROOT_ORIGIN =
  ROOT_ORIGIN != "null" && ROOT_ORIGIN != "undefined"
    ? ROOT_ORIGIN
    : UMOOC_HOST;

var CONFIG_LOGIN_HOST = ROOT_ORIGIN;
var httpReg = /^(http|https)/;
if (!httpReg.test(CONFIG_LOGIN_HOST)) {
  CONFIG_LOGIN_HOST = window.location.protocol + "//" + CONFIG_LOGIN_HOST;
}
if (!httpReg.test(ROOT_ORIGIN)) {
  ROOT_ORIGIN = window.location.protocol + "//" + ROOT_ORIGIN;
}

if (urlStyle && urlStyle == "2") {
  baseHost = baseHost ? baseHost : host;

  // 公共配置参数
  CONFIG_API_HOST = protocol + "ua" + hostDomain + "/uaapi"; // 后台接口地址
  API_SERVER_HOST = protocol + baseHost + "/courseapi";
  KG_API_HOST = protocol + baseHost + "/knowledgeapi";
  AI_API_HOST = protocol + baseHost + "/cloudsearchapi";

  UMOOC_HOST = protocol + baseHost; // 优学院 www.tongshike.cn
  DOMAIN_HOST = COOKIE_DOMAIN; // 优学院 .tongshike.cn

  KG_WEB_HOST = protocol + baseHost + "/knowledge";
  UMOOC_WEB_HOST = protocol + baseHost + "/mooc";
  UTEST_WEB_HOST = protocol + baseHost + "/utest";
  UA_WEB_HOST = protocol + "ua" + hostDomain;
  DATA_WEB_HOST = protocol + baseHost + "/shuju";

  //资源服务
  CONFIG_QINIU_RESOURCE_URL = protocol + baseHost + "/uobs/view/";
  CONFIG_QINIU_MEDIA_URL = CONFIG_QINIU_RESOURCE_URL;
  CONFIG_QINIU_BASE64_URL = protocol + baseHost + "/uobs/putb64/-1";
  UPLOAD_SERVER_HOST = baseHost + "/uobs";
  UPLOAD_SERVER_PROTOCOL = protocol.indexOf("https") === 0 ? "https" : "http";

  //资源库
  REPOSITORY_SERVER_HOST = protocol + baseHost + "/rsglapi";
  SOURCE_SERVER_HOST = protocol + baseHost + "/rm";

  //静态资源
  UMOOC_STATIC_HOST = protocol + baseHost + "/static";

  //文档服务
  DOCS_HOST = docHost ? protocol + docHost : "https://docs.ulearning.cn";

  CONFING_CHIVOX = "1515725381000022";
  isI18n = false;

  // 新版资源库
  ZYK_WEB_HOST = protocol + baseHost + "/zyk";
  ZYK_WEB_API = protocol + baseHost + "/zykapi";
}

//写cookies
function setCookie(name, value, path) {
  var cookie = name + "=" + escape(value);
  if (path) {
    cookie += ";path=" + path;
  }
  document.cookie = cookie;
}

window.setFullCookie = function (c_name, value, expiredays, path, domain) {
  // domain只能设置为当前域名的更高级域名，
  // 如：在www.tongshike.cn 中可以设置为.tongshike.cn 而不能设置为ua.tongshike.cn
  var exdate = new Date();
  exdate.setDate(exdate.getDate() + expiredays);
  document.cookie =
    c_name +
    "=" +
    escape(value) +
    (expiredays == null ? "" : "; expires=" + exdate.toGMTString()) +
    (path == null ? "" : "; path=" + escape(path)) +
    (domain == null ? "" : "; domain=" + escape(domain));
};

//获取cookies
function getCookie(name) {
  var arr,
    reg = new RegExp("(^| )" + name + "=([^;]*)(;|$)");
  if ((arr = document.cookie.match(reg))) return unescape(arr[2]);
  else return null;
}

//删除cookies
function delCookie(name) {
  var exp = new Date();
  exp.setTime(exp.getTime() - 1);
  var cval = getCookie(name);
  if (cval != null)
    document.cookie = name + "=" + cval + ";expires=" + exp.toGMTString();
}

function deepCopy(source) {
  var temp = JSON.stringify(source);
  return JSON.parse(temp);
}

// 兼容uobs
function setObsConfig(config) {
  if (UPLOAD_SERVER_HOST) {
    config.config = {
      uphost: UPLOAD_SERVER_HOST,
      upprotocol: UPLOAD_SERVER_PROTOCOL,
    };
  }
  return config;
}
