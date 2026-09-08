// Avoid `console` errors in browsers that lack a console.
(function () {
  var method;
  var noop = function () {};
  var methods = [
    "assert",
    "clear",
    "count",
    "debug",
    "dir",
    "dirxml",
    "error",
    "exception",
    "group",
    "groupCollapsed",
    "groupEnd",
    "info",
    "log",
    "markTimeline",
    "profile",
    "profileEnd",
    "table",
    "time",
    "timeEnd",
    "timeline",
    "timelineEnd",
    "timeStamp",
    "trace",
    "warn",
  ];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
})();

// Place any jQuery/helper plugins in here.
window.getUrlParam = function (name) {
  var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
  var r = window.location.search.substr(1).match(reg);
  if (r != null) return decodeURI(r[2]);
  return null;
};

window.questionType = {
  1: "单选题",
  2: "多选题",
  3: "填空题",
  4: "判断题",
  5: "问答题",
  6: "匹配题",
  7: "阅读题",
  8: "听力题",
  9: "写作题",
  10: "翻译题",
  11: "完形填空题",
  12: "排序题",
  13: "说明模块",
  14: "语法模块",
  15: "词汇模块",
  16: "口语模块",
  17: "阅读题(选词填空)",
  18: "附件上传题",
  19: "听力客观题",
  20: "多个空无顺序的填空题",
  21: "论述题",
  22: "材料分析题",
  23: "下拉选择题",
  24: "综合题",
};

window.isQuestionSupport = function (type) {
  switch (type) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 11:
    case 12:
    case 17:
    case 23:
    case 24:
      return true;
      break;
    default:
      return false;
  }
};

var fileLimit = {
  video: {
    format: "mp4,mpg,mpeg,avi,rmvb,rm,wmv,mov",
    size: 1024,
    transcoding: "自动转码(H.264编码的mp4格式)，切片(流媒体播放)，压缩(128~1024kbps)",
    type: "video",
  },
  audio: {
    format: "mp3,aac,wav,wma,ogg,m4a",
    size: 50,
    transcoding: "自动转码(AAC编码的mp3格式)，切片(流媒体播放)，压缩",
    type: "audio",
  },
  image: {
    format: "png,jpg,jpeg,gif,bmp",
    size: 2,
    transcoding: "--",
    type: "image",
  },
  doc: {
    format: "pdf,ppt,pptx",
    size: 50,
    transcoding: "转图片",
    type: "doc",
  },
};

window.setCookie = function (c_name, value, expiredays, path, domain) {
  // domain只能设置为当前域名的更高级域名，
  // 如：在www.tongshike.cn中可以设置为.tongshike.cn而不能设置为ua.tongshike.cn
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

window.getCookie = function (c_name) {
  if (document.cookie.length > 0) {
    var c_start = document.cookie.indexOf(c_name + "=");
    if (c_start != -1) {
      c_start = c_start + c_name.length + 1;
      var c_end = document.cookie.indexOf(";", c_start);
      if (c_end == -1) c_end = document.cookie.length;
      return unescape(document.cookie.substring(c_start, c_end));
    }
  }
  return "";
};

window.isIE = function () {
  if (!!window.ActiveXObject || "ActiveXObject" in window) {
    return true;
  } else {
    return false;
  }
};

window.getFileType = function (fileName) {
  var Suffix = fileName.substring(fileName.lastIndexOf(".") + 1);
  Suffix = Suffix.toLowerCase();
  for (fileType in fileLimit) {
    var limit = fileLimit[fileType].format;
    if (limit.indexOf(Suffix) != -1) {
      return fileLimit[fileType].type;
    }
  }
};

window.isInArray = function (item, array) {
  if (item != undefined && array && array.length) {
    for (var i = 0; i < array.length; i++) {
      if (item == array[i]) {
        return true;
      }
    }
  }
  return false;
};

window.isEqualArray = function (array1, array2) {
  if (array1 && array1.length && array2 && array2.length) {
    var leftArray = deepCopy(array1);
    var rightArray = deepCopy(array2);
    var equalItemNum = 0;
    for (var i = 0; i < leftArray.length; i++) {
      var leftItem = leftArray[i];
      for (var j = 0; j < rightArray.length; j++) {
        var rightItem = rightArray[j];
        if (leftItem == rightItem) {
          equalItemNum++;
          rightArray.splice(j, 1);
          break;
        }
      }
    }
    if (equalItemNum == array1.length && equalItemNum == array2.length) {
      return true;
    }
  }
  return false;
};

window.deepCopy = function (source) {
  var temp = JSON.stringify(source);
  return JSON.parse(temp);
};

window.formatSeconds = function (value, needHour) {
  var theTime = parseInt(value); // 秒
  var theTime1 = 0; // 分
  var theTime2 = 0; // 小时
  if (theTime > 60) {
    theTime1 = parseInt(theTime / 60);
    theTime = parseInt(theTime % 60);

    if (theTime1 > 60) {
      theTime2 = parseInt(theTime1 / 60);
      theTime1 = parseInt(theTime1 % 60);
    }
  }

  var result;
  if (theTime < 10) {
    result = "0" + parseInt(theTime) + "";
  } else {
    result = "" + parseInt(theTime) + "";
  }

  if (theTime1 > 9) {
    result = "" + parseInt(theTime1) + ":" + result;
  } else if (theTime1 > 0) {
    result = "0" + parseInt(theTime1) + ":" + result;
  } else {
    result = "0" + 0 + ":" + result;
  }

  if (needHour) {
    if (theTime2 > 0) {
      result = "" + parseInt(theTime2) + ":" + result;
    } else {
      result = "0" + 0 + ":" + result;
    }
  }

  return result;
};

function formatYYMMddHHmm(time) {
  if (!time) {
    return "";
  }
  var date = new Date(time);
  var month = date.getMonth() + 1;
  return (
    date.getFullYear() +
    "-" +
    (month > 9 ? month : "0" + month) +
    "-" +
    (date.getDate() > 9 ? date.getDate() : "0" + date.getDate()) +
    " " +
    (date.getHours() > 9 ? date.getHours() : "0" + date.getHours()) +
    ":" +
    (date.getMinutes() > 9 ? date.getMinutes() : "0" + date.getMinutes())
  );
}

function getPlatform() {
  var ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios-platform";
  } else if (/android/.test(ua)) {
    return "android-platform";
  } else if (/arkweb/.test(ua)) {
    return "harmony-platform";
  }  
  return "";
}

// 判断浏览器类型
window.BrowserType = function () {
  var userAgent = navigator.userAgent; //取得浏览器的userAgent字符串
  var isOpera = userAgent.indexOf("Opera") > -1; //判断是否Opera浏览器
  // var isIE = userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera; //判断是否IE浏览器
  var isIE = !!window.ActiveXObject || "ActiveXObject" in window;
  var isEdge = userAgent.indexOf("Edge") > -1; //判断是否IE的Edge浏览器
  var isFF = userAgent.indexOf("Firefox") > -1; //判断是否Firefox浏览器
  var isSafari = userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") == -1; //判断是否Safari浏览器
  var isChrome = userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1; //判断Chrome浏览器
  var isMobile = userAgent.toLowerCase().indexOf("mobile") > -1;

  if (isMobile) {
    return "mobile";
  }
  if (isIE) {
    var reIE = new RegExp("MSIE (\\d+\\.\\d+);");
    reIE.test(userAgent);
    var fIEVersion = parseFloat(RegExp["$1"]);
    if (fIEVersion == 7) {
      return "IE7";
    } else if (fIEVersion == 8) {
      return "IE8";
    } else if (fIEVersion == 9) {
      return "IE9";
    } else if (fIEVersion == 10) {
      return "IE10";
    } else if (fIEVersion == 11) {
      return "IE11";
    } else {
      if (userAgent.indexOf("Trident") > -1 && userAgent.indexOf("rv:11.0") > -1) {
        return "IE11";
      } else {
        return "IE";
      }
    } //IE版本过低
  } //isIE end

  if (isEdge) {
    return "Edge";
  }
  if (isFF) {
    return "FF";
  }
  if (isOpera) {
    return "Opera";
  }
  if (isSafari) {
    return "Safari";
  }
  if (isChrome) {
    return "Chrome";
  }
  return "other";
}; // BrowserType() end

(function (window) {
  var browser = BrowserType();
  var allowObj = {
    "IE9": true,
    "IE10": true,
    "IE11": true,
    "FF": true,
    "Chrome": true,
    "Safari": true,
    "mobile": true,
  };
  var isPreview = getUrlParam("isPreview");
  if (navigator.userAgent.indexOf("umoocApp") > -1 || isPreview) {
    return;
  }
  if (allowObj[browser]) {
    // if (browser == "Chrome") {
    //   var userAgent = navigator.userAgent;
    //   if (userAgent.substring(userAgent.indexOf("AppleWebKit")).length < 78 || userAgent.indexOf("QIHU") > -1 || userAgent.indexOf("QQBrowser") > -1) {
    //   } else {
    //     window.location.assign("./compatibility.html");
    //   }
    // }
  } else {
    window.location.assign("./compatibility.html");
  }
})(window);

$.showScript = function (title, content) {
  var html =
    '\
  <div class="full-mask">\
    <div class="component-header">\
      <div class="left"><i class="iconfont">&#xe907;</i></div>\
      <div class="title">' +
    title +
    '</div>\
      <div class="right"></div>\
    </div>\
    <div class="content">' +
    content +
    "</div>\
  </div>";
  $("body").append(html);
  window.currentView = "audioscriptView";
  setTimeout(function () {
    $(".full-mask").addClass("show-mask");
  }, 100);

  $(".full-mask .left").on("click", function (event) {
    var that = this;
    $(that).parent().parent().removeClass("show-mask");
    setTimeout(function () {
      $(that).parent().parent().remove();
      window.currentView = "mainView";
    }, 1000);
  });
};

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  };
}

function isNil(arg) {
  return arg === null || arg === undefined;
}

function i18nRaw(str, replace) {
  if (!str) return [];
  var tokens = [];
  var token = "";
  var i = 0;
  while (i < str.length) {
    var s = str[i];
    if (s === "\\") {
      if (i < str.length && str[i + 1] === "{") {
        token += "{";
        i++;
      } else {
        token += s;
      }
    } else if (s === "{") {
      if (i + 1 < str.length) {
        i++;
        var n = str[i];
        var key = "";
        while (i < str.length && n !== "}") {
          key += n;
          i++;
          n = str[i];
        }
        key = key.trim();
        if (n === "}") {
          tokens.push(token);
          token = "";
          if (!isNil(replace[key])) {
            tokens.push(replace[key]);
          }
        } else {
          token += s + key;
        }
      } else {
        token += s;
      }
    } else {
      token += s;
    }
    i++;
  }
  tokens.push(token);
  return tokens;
}

function i18nReplace(str, replace) {
  return i18nRaw(str, replace).join("");
}

function i18nPlural(str, number, replace) {
  if (number === undefined) {
    number = 1;
  } else if (typeof number !== "number") {
    number = 0;
  }
  number = Math.abs(number);
  var arr = str.split(/(?:[^\\])\|/);
  var text = "";
  if (arr.length <= 1) {
    text = str;
  } else if (arr.length < 3) {
    if (number === 0) {
      text = arr[1];
    } else {
      text = arr[Math.min(number - 1, arr.length - 1)];
    }
    text = text.trim();
  } else {
    text = arr[Math.min(number, arr.length - 1)];
    text = text.trim();
  }
  return replace ? i18nReplace(text, replace) : i18nReplace(text, { count: number });
}
