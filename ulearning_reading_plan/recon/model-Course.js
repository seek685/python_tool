define(['knockout', 'model/Chapter'], function (ko, Chapter) {
  function Course(id, name, author, locale) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
    this.author = ko.observable(author);
    this.locale = ko.observable('zh');

    this.chapters = ko.observableArray();

    this.loadFailed = ko.observable(false);

    if (typeof Course._initialized == "undefined") {
      Course.prototype.showName = function () {
        console.log(this.name);
      };

      Course._initialized = true;
    }
  };

  // 获取资源服务器地址
  Course.prototype.reterieveResourceServer = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/organ/path/" + self.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        if (result.host) {
          var localHost = result.host;
          // 验证资源服务器是否可以访问
          $.ajax({
            url: localHost + '/index.html',
            type: "GET",
            contentType: "text/plain",
            async: true,
            data: null,
            success: function (result, status, xhr) {
              window.CONFIG_QINIU_RESOURCE_URL = localHost + '/';
            },
            error: function (xhr, status, error) {
              console.log("无法连接到资源服务器：" + localHost);
            }
          });
        }

        callbackSuccess && callbackSuccess();
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取课程基本信息
  Course.prototype.reterieveCourseInfo = function (isAuditionMode, callbackSuccess, callbackError) {
    var self = this;
    if (!window.appMode) {
      $.ajax({
        url: CONFIG_API_HOST + "/course/" + self.id() + (isAuditionMode ? "/basicinformationnottoken" : "/basicinformation"),
        type: "GET",
        contentType: "text/plain",
        dataType: "json",
        async: true,
        data: null,
        success: function (result, status, xhr) {
          self.name(result.course.name);
          self.author(result.course.author);
          self.locale(result.course.needapprove);

          callbackSuccess && callbackSuccess();
        },
        error: function (xhr, status, error) {
          console.log(error);
          callbackSuccess && callbackSuccess();
        }
      });
    } else {
      window.CoursePlayer.courseInfo(function (jsonString) {
        var result;
        try {
          result = JSON.parse(jsonString);
        } catch (e) {
          result = jsonString;
        }

        if (result.course) {
          result = result.course;
        }
        if (result.courseType == "xml") {
          window.courseType = "xml";
        }
        self.name(result.name);
        self.locale(result.needapprove == 1 ? 'en' : 'zh');

        callbackSuccess && callbackSuccess();
      });
    }
  };

  // 获取用户班级相关的课程信息
  Course.prototype.reterieveCourseClassInfo = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/classes/" + self.id() + (self.classId ? ("?classId=" + self.classId) : ""),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取课程是否已过期
  Course.prototype.reterieveCourseRemaining = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/course/" + self.id() + "/remaining",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackSuccess && callbackSuccess();
      }
    });
  };

  // 获取课程目录
  Course.prototype.reterieveCourseDirectory = function (isPreviewMode, isAuditionMode, notQRcode, callbackSuccess, callbackError) {
    var self = this;

    function handler(result, callbackSuccess) {
      if (result.chapters) {
        result = result.chapters;
      }

      self.chapters.removeAll();
      for (var i = 0; result && i < result.length; i++) {
        var c = result[i];
        if (window.isAuthorPreview) {
          c.hide = c.isuserful == 0 ? 1 : 0;
        }
        var chapter = new Chapter(c.nodeid, c.nodetitle, c.hide, c.id);
        chapter.sort = i;
        if (chapter.isHide() == 2) {
          chapter.isHide(0);
          chapter.canStudy = 1;
        }
        chapter.setSections(c.items, notQRcode);

        self.chapters.push(chapter);
      }

      callbackSuccess && callbackSuccess();
    }

    // if (!window.appMode) {
    // isPreviewMode = false;

    var restUrl;
    if (isPreviewMode) {
      restUrl = "/course/";
    } else {
      restUrl = "/course/stu/";
    }
    if (isAuditionMode) {
      restUrl = "/course/all/";
    }

    $.ajax({
      url: CONFIG_API_HOST + restUrl + self.id() + "/directory" + (self.classId ? ("?classId=" + self.classId) : ""),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        handler(result, callbackSuccess);
      },
      error: function (xhr, status, error) {
        self.loadFailed(true);
        console.log(error);
        callbackError && callbackError();
      }
    });
    // } else {
    //   window.CoursePlayer.courseDirectory(function(jsonString) {
    //     var result;
    //     try {
    //       result = JSON.parse(jsonString);
    //     } catch (e) {
    //       result = jsonString;
    //     }

    //     handler(result, callbackSuccess);
    //   });
    // }
  };

  Course.prototype.judgeIsLearning = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/studyrecord/studyingstatus",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  Course.prototype.reterieveStuCourse = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/courseListStu",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  Course.prototype.reterieveLog = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/studyrecord/log/unusual",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: {
        courseId: self.id()
      },
      success: function (result, status, xhr) {

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  Course.prototype.postCachedResourceNum = function (num,callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/localResStudy/log?courseId=" + self.id() + "&localResCount=" + num,
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess();
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  }
  return Course;
});