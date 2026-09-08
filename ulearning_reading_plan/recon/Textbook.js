(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define(['knockout'], factory);
  } else if (typeof exports === 'object') {
    // Node, CommonJS之类的
    module.exports = factory(require('knockout'));
  } else {
    // 浏览器全局变量(root 即 window)
    root.returnExports = factory(root.ko);
  }
}(this, function (ko) {
  // var API_SERVER_HOST = "http://192.168.1.59:1111";

  function Textbook(id, name, type, cover, opencourse, needapprove, coursetype, creatorType, allowfreedomreg, creator, creatorName, orgId) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
    this.type = ko.observable(type);
    this.cover = ko.observable(cover);

    this.opencourse = ko.observable(opencourse || 1);   //1开放课程  2互动教材
    this.needapprove = ko.observable(needapprove || 0);  //0 中文 1英文
    this.coursetype = ko.observable(coursetype || 4)  //4mooc  5公开课
    this.creatorType = ko.observable(creatorType || 2);  //1编辑账号 2教师账号
    this.allowfreedomreg = ko.observable(allowfreedomreg);
    this.creator = ko.observable(creator);
    this.creatorName = ko.observable(creatorName);
    this.orgId = ko.observable(orgId);

    this.progress = ko.observable();
    this.learningTime = ko.observable();
    this.score = ko.observable();

    this.chapterList = ko.observableArray();

    this.knowledgeGraphId = ko.observable()     //课件关联的图谱id
    this.graphStartupStatus = ko.observable(0)  //课件关联的图谱开启状态 0关闭 1开启
    this.graphPublishStatus = ko.observable(0)  //课件关联的图谱发布状态 0关闭 1开启

  }
  Textbook.Chapter = function (id, name, isHided, startTime, endTime) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
    this.startTime = ko.observable(startTime);
    this.endTime = ko.observable(endTime);

    this.isHided = ko.observable(isHided);

    this.sectionList = ko.observableArray();
  }
  Textbook.Section = function (id, name, isHided) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);

    this.isHided = ko.observable(isHided);

    this.pageList = ko.observableArray();
  }
  Textbook.Page = function (id, name) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
  }
  // 教学计划
  Textbook.TeachingPlan = function () {
    this.enableStudy = ko.observable(1);
    this.redo = ko.observable(false);
    this.showAnswer = ko.observable(true);

    this.teachingPlanChapterList = [];
  }
  Textbook.ChapterTeachingPlan = function () {
    this.nodeId;
    this.unitStudyTimeId;
    this.courseId;
    this.classId;
    this.nodeTitle;
    this.startDate;
    this.endDate;
    this.enableStudy;
    this.hide;

    this.sectionList = [];
  }
  Textbook.SectionTeachingPlan = function () {
    this.nodeId;
    this.nodeTitle;
    this.hide;
  }

  // var API_SERVER_HOST = "http://192.168.10.132:1111";

  Textbook.prototype.create = function (callbackSuccess, callbackError) {
    var data = {
      name: this.name(),
      creatorType: this.creatorType(),
      opencourse: this.opencourse(),
      needapprove: this.needapprove(),
      coursetype: this.coursetype()
    }
    return $.ajax({
      url: UA_API_HOST + "/courses",
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      data: JSON.stringify(data),
      async: false,
      // success: function(result, status, xhr) {
      //   callbackSuccess && callbackSuccess(result);
      // },
      // error: function(xhr, status, error) {
      //   console.log(error);
      //   callbackError && callbackError();
      // }
    });
  }
  Textbook.prototype.isNameExist = function (callbackSuccess, callbackError) {
    $.ajax({
      url: UA_API_HOST + "/courses/checkName?name=" + this.name(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  }
  Textbook.prototype.delete = function (callbackSuccess, callbackError) {
    $.ajax({
      url: UA_API_HOST + "/course/delete/" + this.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  }


  // 获取教材详情
  Textbook.prototype.retrieveTextbookDetail = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/homepage/textbooks/" + self.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取互动教材列表
  Textbook.prototype.retrieveInteractiveTextbookList = function (params, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/homepage/textbooks?pn=" + params.pn + "&ps=" + params.ps +
        "&type=" + params.type + "&seclassifyId=" + params.seclassifyId + "&subjectId=" + params.subjectId +
        "&order=" + params.order + "&keyword=" + params.keyword + "&orgId=" + params.orgId + "&aspId=" + params.aspId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取指定教材的四门推荐教材
  Textbook.prototype.retrieveFourRecommendedTextbook = function (textbookId, orgId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/homepage/recommendedTextbooks?textbookId=" + textbookId + "&orgId=" + orgId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  //教材激活验证激活码(我的教材/激活教材)
  Textbook.prototype.verifyActivateCodeClass = function (code, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/code/" + code,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 激活教材(我的教材/激活教材)
  Textbook.prototype.activateTextbookClass = function (code, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/code/" + code,
      type: "PUT",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  //课件验证激活码(课程/课件)
  Textbook.prototype.verifyActivateCode = function (code, ocId, textbookId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/code/" + code + "?ocId=" + ocId + "&textbookId=" + textbookId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 激活课件(课程/课件)
  Textbook.prototype.activateTextbook = function (code, ocId, textbookId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/code/" + code + "?ocId=" + ocId + "&textbookId=" + textbookId,
      type: "PUT",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件列表
  Textbook.prototype.retrieveTextbookList = function (courseId, keyword, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/list?ocId=" + courseId + "&keyword=" + keyword,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件列表  接入ua新加的获取接口
  Textbook.prototype.retrieveTeacherTextbookList = function (courseId, keyword, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/teacher/list?ocId=" + courseId + "&keyword=" + keyword,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取某课程班级下的课件列表
  Textbook.prototype.retrieveTextbookListInCourseClass = function (courseId, classId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/and/directory?ocId=" + courseId + "&classId=" + classId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取学生端课件列表
  Textbook.prototype.retrieveStudentTextbookList = function (courseId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/student/" + courseId + "/list",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 我的教材列表
  Textbook.prototype.retrieveMyTextbookList = function (keyword, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/student/list?keyword=" +
        keyword,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取课件列表，从c表获取
  Textbook.prototype.retrieveDirectory = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan/coursecontent/" + self.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        for (var i = 0; i < result.length; i++) {
          var c = result[i];

          var chapter = new Textbook.Chapter(c.chapterId, c.chapterName);
          for (var j = 0; j < c.sectionList.length; j++) {
            var s = c.sectionList[j];

            var section = new Textbook.Section(s.sectionId, s.sectionName);
            chapter.sectionList.push(section);
          }
          self.chapterList.push(chapter);
        }

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件列表，从u表获取
  Textbook.prototype.retrievePublishedDirectory = function (ocId, classId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/directory?ocId=" + ocId + "&classId=" + classId + "&textBookId=" + self.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        self.chapterList.removeAll();
        for (var i = 0; result.chapters && i < result.chapters.length; i++) {
          var c = result.chapters[i];

          var chapter = new Textbook.Chapter(c.nodeId, c.nodeTitle, null, c.startTime, c.endTime);
          chapter.nodeType = c.nodeType;
          chapter.chapterId = c.id;
          chapter.paperId = c.paperId;
          for (var j = 0; c.items && j < c.items.length; j++) {
            var s = c.items[j];

            var section = new Textbook.Section(s.itemId, s.title);
            section.sectionId = s.id;
            chapter.sectionList.push(section);
          }
          self.chapterList.push(chapter);
        }

        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取学生课件列表和学习进度
  Textbook.prototype.retrieveLearningProgress = function (courseId, platformType, callbackSuccess, callbackError) {
    var self = this;

    function manageResult(result, callbackSuccess) {
      self.chapterList.removeAll();
      for (var i = 0; result.list && i < result.list.length; i++) {
        var c = result.list[i];

        var chapter = new Textbook.Chapter(c.currentUnitID, c.currentUnit);
        if (c.courseExerciseID) {
          chapter.id(c.courseExerciseID);
        }
        chapter.nodeType = c.nodeType;
        chapter.paperId = c.paperId;
        chapter.isHided(c.hide);
        chapter.progress = c.progress ? c.progress * 100 : 0;
        if (chapter.progress.toFixed) {
          chapter.progress = chapter.progress.toFixed(0);
        }
        chapter.learningTime = c.timeConsuming ? c.timeConsuming : 0;
        chapter.score = c.score ? c.score : 0;
        chapter.isStrategy = c.isStrategy ? true : false; // 是否已纳入考核
        if (chapter.score > 0) {
          chapter.score = parseFloat(chapter.score).toFixed(0);
        }

        if (c.planState) {
          chapter.startTime = c.planState.startDate;
          chapter.endTime = c.planState.endDate;

          if (c.hide != 1) {
            self.needPlanCol(true);
          }
        }

        for (var j = 0; result.mobileallItemScore && j < result.mobileallItemScore.length; j++) {
          var s = result.mobileallItemScore[j];

          if (s.unitID == chapter.id()) {
            var section = new Textbook.Section(s.sectionID, s.itemTitle);
            section.progress = s.completionstatus ? 100 : 0;
            section.learningTime = s.totalTime ? s.totalTime : 0;
            section.score = s.score ? s.score : 0;

            chapter.sectionList.push(section);
          }
        }

        self.chapterList.push(chapter);
      }

      self.progress(result.textbook.progress ? result.textbook.progress * 100 : 0);
      if (self.progress() > 0) {
        self.progress(self.progress().toFixed(0));
      }
      self.learningTime(result.textbook.timeConsuming ? result.textbook.timeConsuming : 0);
      self.score(result.textbook.score ? result.textbook.score : 0);
      self.remaining = result.textbook.remaining ? result.textbook.remaining : 0;

      callbackSuccess && callbackSuccess(result);
    }
    if (platformType == 2) {
      $.ajax({
        url: API_SERVER_HOST + "/textbook/student/information/mobile?ocId=" + courseId + "&textbookId=" + self.id(),
        type: "GET",
        contentType: "text/plain",
        dataType: "json",
        async: true,
        success: function (result, status, xhr) {
          manageResult(result, callbackSuccess);
        },
        error: function (xhr, status, error) {
          console.log(error);
          callbackError && callbackError();
        }
      });
    } else {
      $.ajax({
        url: API_SERVER_HOST + "/textbook/student/information?currentPlatformType=1&ocId=" + courseId + "&textbookId=" + self.id(),
        type: "GET",
        contentType: "text/plain",
        dataType: "json",
        async: true,
        success: function (result, status, xhr) {
          manageResult(result, callbackSuccess);
        },
        error: function (xhr, status, error) {
          console.log(error);
          callbackError && callbackError();
        }
      });
    }

  };
  // 获取学生学习进度详情列表
  Textbook.prototype.retrieveStudentLearningDirectory = function (userId, courseId, platformType, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/viewAllScore?userId=" +
        userId + "&currentPlatformType=" + platformType + "&textbookId=" + self.id() + "&ocId=" + courseId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 设置学生重做
  Textbook.prototype.clearStudentRecord = function (data, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/redo",
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: ko.toJSON(data),
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取对应班的教学计划
  Textbook.prototype.retrieveTeachingPlan = function (courseId, classId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan/" + self.id() + "/" + courseId + "/" + classId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 创建教学计划
  Textbook.prototype.createTeachingPlan = function (teachingPlan, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan",
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: JSON.stringify(teachingPlan),
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 修改教学计划
  Textbook.prototype.updateTeachingPlan = function (teachingPlan, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan",
      type: "PUT",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: JSON.stringify(teachingPlan),
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 清楚教学计划
  Textbook.prototype.clearTeachingPlan = function (courseId, classId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan/clear/" + self.id() + "/" + courseId + "/" + classId,
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 讲教学计划应用到其他班级
  Textbook.prototype.copyTeachingPlanToOtherClass = function (courseId, fromClassId, classIds, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/teachingplan/applytootherclasses/" + self.id() + "/" + fromClassId + "?ocId=" + courseId,
      type: "POST",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      data: JSON.stringify(classIds),
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取课件整体学习进度
  Textbook.prototype.retrieveOverallLearningProgress = function (courseId, platformType, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/unitGradeProgress?ocId=" + courseId + "&textbookId=" + self.id() + "&currentPlatformType=" + platformType + "&type=1",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件详细学习进度
  Textbook.prototype.retrieveDetailLearningProgress = function (classId, platformType, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/classLearningProgress?classID=" + classId + "&textbookId=" + self.id() + "&currentPlatformType=" + platformType,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取班级下的章列表
  Textbook.prototype.retrieveclassChapterList = function (classId, platformType, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/chapter?classId=" + classId + "&textbookId=" + self.id() + "&currentPlatformType=" + platformType,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取章详情学习进度
  Textbook.prototype.retrieveChapterDetailLearningProgress = function (classId, platformType, nodeId, callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/progress/classLearningProgress/unit?classID=" + classId + "&textbookId=" + self.id() + "&currentPlatformType=" + platformType + "&nodeId=" + nodeId,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件列表
  Textbook.prototype.getTextbookCourse = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/courses/" + self.id() + "/textbook",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: false,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取带学期的课件列表
  Textbook.prototype.getTextbookCourseWithSemester = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/term/ocList?textbookId=" + self.id(),
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: false,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 学生获取课件列表
  Textbook.prototype.getUseTextbookCourse = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/" + self.id() + "/courses",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: false,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取课件学习人数
  Textbook.prototype.getTextbookSemesterInfo = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: API_SERVER_HOST + "/textbook/" + self.id() + "/learnerCount",
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取爱课程列表
  Textbook.prototype.retrieveICourseTextbookList = function (params, callbackSuccess, callbackError) {
    var self = this;
    var url = API_SERVER_HOST + "/textbook/list/icourse?keyword=" + params.keyword + '&ocId=' + params.ocId
    if (params.type()) {
      url += '&type=' + params.type()
    }
    $.ajax({
      url: url,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };
  // 获取爱课程预览链接
  Textbook.prototype.retrieveICourseUrl = function (callbackSuccess, callbackError) {
    var self = this;
    var url = API_SERVER_HOST + "/icourse/url?textbookId=" + this.id() + '&currentPlatformType=1'
    $.ajax({
      url: url,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  // 获取爱课程统计信息
  Textbook.prototype.retrieveICourseStat = function (params, callbackSuccess, callbackError) {
    var self = this;
    var url = API_SERVER_HOST + "/icourse/studyRecord/tea?textbookId=" + this.id() + '&ocId=' + params.ocId + '&pn=' + params.pn + '&ps=' + params.ps + '&keyword=' + (params.keyword ? params.keyword : '')
    if (params.courseClass().classId() != -1) {
      url += '&classId=' + params.courseClass().classId()
    }
    if (params.teacher().userId != 0) {
      url += '&teacherId=' + params.teacher().userId
    }
    $.ajax({
      url: url,
      type: "GET",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  };

  //获取爱课程课程信息/icourse/21409
  Textbook.prototype.getICourse = function (callbackSuccess, callbackError) {
    $.ajax({
      url: API_SERVER_HOST + '/icourse/' + this.id(),
      type: 'GET',
      contentType: 'text/plain',
      dataType: 'json',
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result)
      },
      error: function (xhr, status, error) {
        callbackError && callbackError()
      }
    })
  }

  //获取爱课程学生端统计信息
  Textbook.prototype.getICourseStuStat = function (callbackSuccess, callbackError) {
    $.ajax({
      url: API_SERVER_HOST + '/icourse/studyRecord/stu?textbookId=' + this.id(),
      type: 'GET',
      contentType: 'text/plain',
      dataType: 'json',
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result)
      },
      error: function (xhr, status, error) {
        callbackError && callbackError()
      }
    })
  }

  Textbook.prototype.clearCheat = function (userId,callbackSuccess, callbackError) {
    $.ajax({
      url: API_SERVER_HOST + "/progress/cheatStatus?textbookId=" + this.id() + '&userId=' + userId,
      type: "DELETE",
      contentType: "text/plain",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result);
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      }
    });
  }

  //获取课件图谱信息
  Textbook.prototype.getKnowledgeGraphDetail = function (callbackSuccess, callbackError) {
    $.ajax({
      url: API_SERVER_HOST + '/knowledgeGraph/byTextbookId?textbookId=' + this.id(),
      type: 'GET',
      contentType: 'text/plain',
      dataType: 'json',
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result)
      },
      error: function (xhr, status, error) {
        callbackError && callbackError()
      }
    })
  }


  //修改课件图片开启状态
  Textbook.prototype.modifyKnowledgeGraphStatus = function (status, callbackSuccess, callbackError) {
    $.ajax({
      url: API_SERVER_HOST + '/knowledgeGraph/startupGraph?graphId=' + this.knowledgeGraphId() + '&startupStatus=' + status,
      type: 'GET',
      contentType: 'text/plain',
      dataType: 'json',
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess(result)
      },
      error: function (xhr, status, error) {
        callbackError && callbackError()
      }
    })
  }

  return Textbook;

}));
