define(['knockout', 'model/Section'], function (ko, Section) {
  function Chapter(id, name, isHide, idForClass) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
    this.isHide = ko.observable(isHide); // 是否被隐藏
    this.isAudition = ko.observable(0); // 是否允许试听
    this.idForClass = ko.observable(idForClass); // 章相对班级的id
    this.canStudy = 0;

    this.sections = ko.observableArray();

    this.sort;
    this.isPageLoaded = ko.observable(false);

    if (typeof Chapter._initialized == "undefined") {
      Chapter.prototype.showName = function () {
        console.log(this.name);
      };

      Chapter._initialized = true;
    }
  };

  Chapter.prototype.setSections = function (response, notQRcode) {
    var self = this;
    self.sections.removeAll();
    var chapterIsAudition = 1;
    for (var j = 0; response && j < response.length; j++) {
      var s = response[j];

      if (window.isAuthorPreview) {
        s.hide = s.ishidepreview == 1 ? 1 : 0;
      }
      if (!notQRcode) {
        s.ishidepreview = 2;
      }
      var section = new Section(s.itemid, s.title, self.isHide() || s.hide,
        self.isAudition() || (s.ishidepreview == 2), s.id);
      section.sort = j;
      if (self.canStudy) {
        section.canstudy = 1;
      }
      section.setPages(s.coursepages);

      self.sections.push(section);

      if (s.ishidepreview != 2) {
        chapterIsAudition = 0;
      }
    }
    self.isAudition(chapterIsAudition);
  };

  Chapter.prototype.reterieveChapterPages = function (callbackSuccess, callbackError) {
    var self = this;

    self.loadingPageCallback = self.loadingPageCallback ? self.loadingPageCallback : [];
    if (self.isLoadingPage) {
      self.loadingPageCallback.push(callbackSuccess);
      return;
    }

    function handler(result, callbackSuccess) {
      // alert(JSON.stringify(result.wholepageItemDTOList[3].wholepageDTOList[1].coursepageDTOList[3]));
      for (var i = 0; i < self.sections().length; i++) {
        var section = self.sections()[i];
        try {
          for (var j = 0; result.wholepageItemDTOList && j < result.wholepageItemDTOList.length; j++) {
            var wholepageItemDTO = result.wholepageItemDTOList[j];

            if (wholepageItemDTO && wholepageItemDTO.itemid == section.id()) {
              section.adaptPages(wholepageItemDTO.wholepageDTOList);
              break;
            }
          }
        } catch (e) {
          console.log("异常" + e.toString());
        }
      }

      callbackSuccess && callbackSuccess();
      if (self.loadingPageCallback && self.loadingPageCallback.length > 0) {
        for (var cbk in self.loadingPageCallback) {
          self.loadingPageCallback[cbk]();
          delete self.loadingPageCallback[cbk];
        }
      }
      self.isLoadingPage = false;
    }

    function newParamHandler(result) {
      for (var i = 0; i < self.sections().length; i++) {
        var section = self.sections()[i];
        try {
          for (var j = 0; result.wholepageItemDTOList && j < result.wholepageItemDTOList.length; j++) {
            var wholepageItemDTO = result.wholepageItemDTOList[j];

            if (wholepageItemDTO && wholepageItemDTO.itemid == section.id()) {
              section.adaptPagesNewParam(wholepageItemDTO.wholepageDTOList);
              break;
            }
          }
        } catch (e) {
          console.log("异常" + e.toString());
        }
      }
    }

    self.isLoadingPage = true;
    if (!window.appMode) {
      $.ajax({
        url: CONFIG_API_HOST + "/wholepage/chapter/stu/" + self.id(),
        type: "GET",
        contentType: "text/plain",
        dataType: "json",
        async: true,
        data: null,
        success: function (result, status, xhr) {
          handler(result, callbackSuccess);
        },
        error: function (xhr, status, error) {
          console.log(error);
          self.isLoadingPage = false;
          callbackError && callbackError();
        }
      });
    } else {
      window.CoursePlayer.courseChapterDetail(self.id(), function (jsonString) {
        var result;
        try {
          result = JSON.parse(jsonString);
        } catch (e) {
          result = jsonString;
        }

        if (window.courseType == "xml") {
          handler(result, callbackSuccess);
        } else {
          $.ajax({
            url: CONFIG_API_HOST + "/wholepage/chapter/stu/" + self.id(),
            type: "GET",
            contentType: "text/plain",
            dataType: "json",
            async: true,
            data: null,
            success: function (result2, status, xhr) {
              handler(result, callbackSuccess);
              newParamHandler(result2, callbackSuccess);
            },
            error: function (xhr, status, error) {
              console.log(error);
              self.isLoadingPage = false;
              callbackError && callbackError();
            }
          });
        }
      });
    }
  };

  Chapter.prototype.saveCurrentStudyChapter = function (courseId, callbackSuccess, callbackError) {
    var self = this;
    var chapterId = self.idForClass() ? self.idForClass() : self.id();
    $.ajax({
      url: CONFIG_API_HOST + "/user/currentUnit?courseId=" + courseId + "&chapterId=" + chapterId,
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
  };

  Chapter.prototype.calculateProgressBySection = function () {
    var chapter = this;
    var totalScore = 0;
    var totalStudyTime = 0;
    var chapterProgress = 0;

    var sectionNum = chapter.sections().length;
    var completeSectionNum = 0;
    for (var i = 0; i < chapter.sections().length; i++) {
      var section = chapter.sections()[i];
      // if (section.isHide()) {
      //   sectionNum--;
      //   continue;
      // }
      var sectionStatData = section.calculateProgress();

      totalStudyTime += sectionStatData.totalStudyTime;
      if (section.record().status()) {
        completeSectionNum++;
      }
      totalScore += sectionStatData.totalScore;
    }

    try {
      if (sectionNum == 0) {
        totalScore = 0;
      } else {
        totalScore = parseInt(totalScore / sectionNum);
      }
    } catch (e) {};
    try {
      if (sectionNum == 0) {
        chapterProgress = 0;
      } else {
        chapterProgress = (completeSectionNum * 100.0 / sectionNum).toFixed(0);
      }
    } catch (e) {};

    return {
      totalScore: totalScore,
      totalStudyTime: totalStudyTime,
      chapterProgress: chapterProgress
    };
  };

  Chapter.prototype.calculateProgressByPage = function () {
    var chapter = this;
    var totalScore = 0;
    var totalStudyTime = 0;
    var chapterProgress = 0;

    var pageNum = 0;
    var completePageNum = 0;
    for (var i = 0; i < chapter.sections().length; i++) {
      var section = chapter.sections()[i];
      // if (section.isHide()) {
      //   continue;
      // }
      for (var j = 0; j < section.pages().length; j++) {
        var page = section.pages()[j];
        // if (page.isHide()) {
        //   continue;
        // }
        var pageRecord = page.getRecord();
        pageNum++;
        if (pageRecord.status()) {
          completePageNum++;
        }

        var pageScore = pageRecord.score();

        // if (window.getRecordMap[pageRecord.pageId()] != pageScore) {
        //   console.log("获取时候的学习记录:" + pageRecord.pageId() + "---" + window.getRecordMap[pageRecord.pageId()]);
        //   console.log("运算时候的学习记录:" + pageRecord.pageId() + "---" + pageScore);
        // }
        // var pageTotalScore = page.getTotalScore();
        // // 习题页面最终得分按照 本页得分/练习总分*100.0向下取整
        // if (pageTotalScore != 100) {
        //   try {
        //     if (pageTotalScore != 0) {
        //       pageScore = parseInt(100.0 * pageScore / pageTotalScore);
        //     } else {
        //       pageScore = 0;
        //     }
        //   } catch (e) {};
        // }
        totalScore += pageScore;
        totalStudyTime += pageRecord.studyTime() + pageRecord.lastStudyTime;
      }
    }

    // console.log("获取总分：" + window.getTotalScore);
    // console.log("运算总分：" + totalScore);
    try {
      if (pageNum == 0) {
        totalScore = 0;
      } else {
        totalScore = parseInt(totalScore / pageNum);
      }
    } catch (e) {};
    try {
      if (pageNum == 0) {
        chapterProgress = 0;
      } else {
        chapterProgress = (completePageNum * 100.0 / pageNum).toFixed(0);
      }
    } catch (e) {};

    return {
      totalScore: totalScore,
      totalStudyTime: totalStudyTime,
      chapterProgress: chapterProgress
    };
  };

  Chapter.prototype.clearRecordFrom = function (callbackSuccess, callbackError) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/studyrecord/beginFromChapterId?chapterId=" + self.id(),
      type: "DELETE",
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
  };

  return Chapter;
});