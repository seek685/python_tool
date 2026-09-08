define(["knockout", "model/Page", "CryptoJS"], function (ko, Page, CryptoJS) {
  function Section(id, name, isHide, isAudition, idForClass) {
    this.id = ko.observable(id);
    this.name = ko.observable(name);
    this.isHide = ko.observable(isHide); // 是否被隐藏
    this.isAudition = ko.observable(isAudition); // 是否可试听
    this.idForClass = ko.observable(idForClass); // 节相对班级的id
    this.canStudy = 0;
    this.isTeacherDevelopment = getUrlParam("isTeacherDevelopment") == 1;
    this.pages = ko.observableArray();

    this.sort;
    this.isPageLoaded = ko.observable(false);
    this.isRecordLoaded = ko.observable(false);
    this.canSave = false; // 如果一直没有获取到历史学习记录，10秒后允许用户保存新的记录
    this.record = ko.observable(new Section.SectionRecord());
    this.studyStartTime;
    this.heartbeatTask;

    this.failTimes = 0;

    if (typeof Section._initialized == "undefined") {
      Section.prototype.showName = function () {
        console.log(this.name);
      };

      Section._initialized = true;
    }
  }
  Section.SectionRecord = function (
    id,
    status,
    learnerId,
    learnerName,
    isCustomized,
    chapterId,
    sectionId,
    sectionName,
    sectionStudyTime,
    version
  ) {
    this.id = ko.observable(id);
    this.status = ko.observable(status);
    this.learnerId = ko.observable(learnerId);
    this.learnerName = ko.observable(learnerName);
    this.isCustomized = ko.observable(isCustomized);
    this.chapterId = ko.observable(chapterId);
    this.sectionId = ko.observable(sectionId);
    this.sectionName = ko.observable(sectionName);
    this.sectionStudyTime = ko.observable(
      sectionStudyTime ? sectionStudyTime : 0
    );
    this.version = ko.observable(version); // 用来处理学习记录合并的版本号
    this.withoutOld = 1; // 未获取到老学习记录

    this.pageRecords = ko.observableArray();

    this.pageRecordMap;
  };

  Section.prototype.setPages = function (response) {
    var self = this;
    self.pages.removeAll();
    for (var k = 0; response && k < response.length; k++) {
      var p = response[k];

      if (p.contentType < 5 || p.contentType > 7) {
        p.contentType = 5;
      }
      if (window.courseType == "xml") {
        p.relationid = p.id;
      } else if (window.appMode) {
        p.originId = p.id;
        p.id = p.relationid;
      }
      p.hide = 0;
      if (window.isAuthorPreview) {
        p.hide = p.status == 2 ? 1 : 0;
      }
      var page = new Page(
        p.id,
        p.relationid,
        p.title,
        p.contentType,
        self.isHide() || p.hide,
        self.isAudition()
      );
      if (window.appMode) {
        page.originId(p.originId);
      }
      page.sort = k;

      self.pages.push(page);
    }
  };

  Section.prototype.adaptPages = function (pageDTOs) {
    var self = this;
    for (var i = 0; i < self.pages().length; i++) {
      var page = self.pages()[i];
      for (var j = 0; j < pageDTOs.length; j++) {
        var pageInfo = pageDTOs[j];
        if (window.appMode) {
          pageInfo.id = pageInfo.relationid;
        }
        if (pageInfo && (pageInfo.id == page.id() || pageInfo.id == page.relationId())) {
          if (!page.isLoaded()) {
            page.adaptPage(pageInfo);
          }
          break;
        }
      }
    }
  };

  Section.prototype.adaptPagesNewParam = function (pageDTOs) {
    var self = this;
    for (var i = 0; i < self.pages().length; i++) {
      var page = self.pages()[i];
      for (var j = 0; j < pageDTOs.length; j++) {
        var pageInfo = pageDTOs[j];
        if (window.appMode) {
          pageInfo.id = pageInfo.relationid;
        }
        if (pageInfo && (pageInfo.id == page.id() || pageInfo.id == page.relationId())) {
          if (page.pageElements().length == 0) {
            page.adaptPage(pageInfo);
          }
          page.adaptPageNewParam(pageInfo);
          break;
        }
      }
    }
  };

  Section.prototype.reterieveSectionPages = function (
    callbackSuccess,
    callbackError
  ) {
    var self = this;
    $.ajax({
      url: CONFIG_API_HOST + "/wholepage/item/stu/" + self.id(),
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        self.isPageLoaded(true);
        self.adaptPages(result);
        callbackSuccess && callbackSuccess();
      },
      error: function (xhr, status, error) {
        console.log(error);
        callbackError && callbackError();
      },
    });
  };

  Section.prototype.init = function (callback) {
    var self = this;
    self.heartbeatCallback = callback;
    self.studyStartTime = 0;
    if (window.antiCheat) {
      $.ajax({
        url: CONFIG_API_HOST + "/studyrecord/initialize/" + this.id(),
        type: "GET",
        contentType: "application/json",
        dataType: "json",
        async: true,
        data: null,
        success: function (result, status, xhr) {
          self.studyStartTime = result;
        },
        error: function (xhr, status, error) {
          console.log(status);
        },
      });

      self.heartbeatTask = setInterval(function () {
        self.heartbeat(callback);
      }, 100 * 1000);
    }
  };
  Section.prototype.heartbeat = function (callback) {
    if (!this.studyStartTime || this.studyStartTime == 0) {
      return;
    }
    $.ajax({
      url: CONFIG_API_HOST +
        "/studyrecord/heartbeat/" +
        this.id() +
        "/" +
        this.studyStartTime,
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        if (result.status == 1) {
          // 同时学习多个页面
          callback();
        }
      },
      error: function (xhr, status, error) {
        console.log(status);
      },
    });
  };
  Section.prototype.stopHeartbeat = function () {
    var self = this;
    clearInterval(self.heartbeatTask);
  };

  Section.prototype.reterieveRecord = function (
    callbackSuccess,
    callbackError
  ) {
    var self = this;

    self.loadingRecordCallback = self.loadingRecordCallback ?
      self.loadingRecordCallback : [];
    if (self.isLoadingRecord) {
      self.loadingRecordCallback.push(callbackSuccess);
      return;
    }

    function handler(result, callbackSuccess) {
      var sectionRecord = new Section.SectionRecord(
        result.relationid,
        result.completion_status,
        result.learner_id,
        result.learner_name,
        result.customized,
        result.node_id,
        result.item_id,
        result.activity_title,
        result.studyTime,
        result.version
      );
      sectionRecord.withoutOld = null;

      var pageRecordMap = {};
      // for (var i = 0; result.pageStudyRecordDTOList && i < result.pageStudyRecordDTOList.length; i++) {
      //   var pageRecord = result.pageStudyRecordDTOList[i];
      //   pageRecordMap[pageRecord.pageid] = pageRecord;

      //   // window.getRecordMap = window.getRecordMap ? window.getRecordMap : {};
      //   // window.getRecordMap[pageRecord.pageid] = pageRecord.score;
      //   // window.getTotalScore = window.getTotalScore ? (window.getTotalScore + pageRecord.score) : pageRecord.score;
      // }
      if (result.pageStudyRecordDTOList) {
        for (var i = result.pageStudyRecordDTOList.length - 1; i >= 0; i--) {
          var pageRecord = result.pageStudyRecordDTOList[i];
          pageRecordMap[pageRecord.pageid] = pageRecord;
        }
      }
      sectionRecord.pageRecordMap = pageRecordMap;

      for (var i = 0; i < self.pages().length; i++) {
        var page = self.pages()[i];
        if (pageRecordMap[page.relationId()]) {
          page.adaptRecord(pageRecordMap[page.relationId()]);
        }
      }

      self.record(sectionRecord);
      callbackSuccess && callbackSuccess(result);
      if (self.loadingRecordCallback && self.loadingRecordCallback.length > 0) {
        for (var cbk in self.loadingRecordCallback) {
          self.loadingRecordCallback[cbk]();
          delete self.loadingRecordCallback[cbk];
        }
      }
      self.isRecordLoaded(true);
      self.isLoadingRecord = false;
    }

    self.isLoadingRecord = true;
    // if (!window.appMode) {
    $.ajax({
      url: CONFIG_API_HOST +
        "/studyrecord/item/" +
        this.id() +
        "?courseType=" +
        (window.courseType == "xml" ? 1 : 4),
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        handler(result, callbackSuccess);
      },
      error: function (xhr, status, error) {
        self.isRecordLoaded(true);
        console.log(status);
        callbackError && callbackError();
        self.isLoadingRecord = false;
      },
    });
    setTimeout(function () {
      self.canSave = true;
    }, 10000);
    // } else {
    //   window.CoursePlayer.sectionStudyRecord(this.id(), function(jsonString) {
    //     var result;
    //     try {
    //       result = JSON.parse(jsonString);
    //     } catch (e) {
    //       result = jsonString;
    //     }

    //     // console.log(result);
    //     handler(result, callbackSuccess);
    //   });
    // }
  };

  Section.prototype.createRecord = function (
    isAsync,
    isAutoSave,
    chapterId,
    callbackSuccess,
    callbackError,
    isGoBack
  ) {
    var self = this;

    if (!self.isRecordLoaded() && !self.canSave) {
      return;
    }

    if (isAutoSave == 1 || isAutoSave == 5) {
      if (new Date().getTime() - self.lastSaveRecordTime < 2000) {
        function getCallback(
          self,
          isAsync,
          isAutoSave,
          chapterId,
          callbackSuccess,
          callbackError,
          isGoBack
        ) {
          return function () {
            self.createRecord(
              isAsync,
              isAutoSave,
              chapterId,
              callbackSuccess,
              callbackError,
              isGoBack
            );
          };
        }
        setTimeout(
          getCallback(
            self,
            isAsync,
            isAutoSave,
            chapterId,
            callbackSuccess,
            callbackError,
            isGoBack
          ),
          2000
        );
        return;
      }
    }

    var record = self.record();

    var status = 1;
    for (var i = 0; i < self.pages().length; i++) {
      var page = self.pages()[i];
      var pageRecord = page.getRecord();

      if (pageRecord.status() != 1) {
        // 所有页都学完才算本节学完
        status = 0;
      }
      if (pageRecord.hasLearned) {
        try {
          for (var j = 0; j < record.pageRecords().length; j++) {
            var rcd = record.pageRecords()[j];

            if (rcd.pageId() == pageRecord.pageId()) {
              record.pageRecords.remove(rcd);
            }
          }
        } catch (e) {}
        record.pageRecords().push(pageRecord);
        // pageRecord.hasLearned = false;
      }
    }
    record.status(status);

    var sectionProgress = self.calculateProgress();
    // 构造提交数据结构
    var ItemStudyRecordUpdateDTO = {
      itemid: self.id(),
      autoSave: isAutoSave,
      version: record.version(),
      withoutOld: record.withoutOld,
      complete: record.status(),
      // learner_id: 274605,
      // studyTime: 1,
      studyStartTime: self.studyStartTime,
      userName: window.userName,
      score: sectionProgress.totalScore,
      pageStudyRecordDTOList: [],
    };
    // ItemStudyRecordUpdateDTO.autoSave = 5;

    if (record.pageRecords().length == 0) {
      callbackSuccess();
      return;
    }
    for (var i = 0; i < record.pageRecords().length; i++) {
      var pageRecord = record.pageRecords()[i];
      var PageStudyRecordDTO = {
        pageid: pageRecord.pageId(),
        complete: pageRecord.status(),
        studyTime: pageRecord.studyTime() > 1000 ? 1000 : pageRecord.studyTime(),
        // studyTime: pageRecord.studyTime() - pageRecord.lastStudyTime,
        score: pageRecord.score(),
        answerTime: 1,
        submitTimes: pageRecord.submitTimes,
        coursepageId: pageRecord.coursepageId(), // 练习页面保存练习组件id
        questions: [],
        videos: [],
        speaks: [],
      };
      // 保存后将本次页面学习时间变成历史时间
      // pageRecord.lastStudyTime += pageRecord.studyTime();
      // pageRecord.studyTime(0);

      for (var j = 0; j < pageRecord.questionRecords().length; j++) {
        var questionRecord = pageRecord.questionRecords()[j];
        var answer = questionRecord.answer();
        if (answer == null || answer == "undefined") {
          continue;
        }
        if (!answer instanceof Array) {
          answer = [answer];
        }
        var QuestionStudyRecordDTO = {
          questionid: questionRecord.questionId(),
          answerList: answer,
          score: questionRecord.userScore() ? questionRecord.userScore() : 0,
        };
        PageStudyRecordDTO.questions.push(QuestionStudyRecordDTO);
        // questionRecord.hasLearned = false;
      }

      // 修复内层播放器时长大于外层学习时长问题

      var innerRecordTime = 0
      
      for (var j = 0; j < pageRecord.videoRecords().length; j++) {
        var videoRecord = pageRecord.videoRecords()[j];
        var VideoStudyRecordDTO = {
          videoid: videoRecord.videoId(),
          current: videoRecord.positionTime(),
          status: videoRecord.status(),
          recordTime: videoRecord.viewTime() - videoRecord.lastViewTime,
          time: videoRecord.videoDuration(),
          startEndTimeList: videoRecord.startEndTimeList,
        };
        // videoRecord.lastViewTime = videoRecord.viewTime();

        innerRecordTime += VideoStudyRecordDTO.recordTime

        PageStudyRecordDTO.videos.push(VideoStudyRecordDTO);
        // videoRecord.hasLearned = false;
      }
      for (var j = 0; j < pageRecord.oralRecords().length; j++) {
        var oralRecord = pageRecord.oralRecords()[j];
        var OralStudyRecordDTO = {
          speakingid: oralRecord.speakingid(),
          score: oralRecord.score(),
          time: oralRecord.time(),
          url: oralRecord.url(),
          answer: oralRecord.answer(),
        };
        // videoRecord.lastViewTime = videoRecord.viewTime();
        PageStudyRecordDTO.speaks.push(OralStudyRecordDTO);
      }

      PageStudyRecordDTO.studyTime >= innerRecordTime ? '' : PageStudyRecordDTO.studyTime = innerRecordTime

      ItemStudyRecordUpdateDTO.pageStudyRecordDTOList.push(PageStudyRecordDTO);
    }

    function handler(result, callbackSuccess, callbackError) {
      if (result != 1 && !(result == 2 && self.studyStartTime == 0)) {
        console.log("保存学习记录失败，防刷分");

        stopAllMedia();

        if (result == 2) {
          clearInterval(window.autoSaveTimer);
          koLearnCourseViewModel.modalType("stopLearning");

          koLearnCourseViewModel.alertModal.show(
            function () {},
            function () {},
            function () {
              koLearnCourseViewModel.goBack();
            }
          );
          $("#alertModal #currentTime").text(formatYYMMddHHmm(new Date()));
        } else {
          // koLearnCourseViewModel.modalType("createRecordFailed");
          // koLearnCourseViewModel.alertModal.show(function() {}, function() {
          //   // 重发
          //   self.createRecord(true, 5, chapterId);
          // }, function() {});
          // $("#lastStudySection").text(self.name());
          if (self.failTimes > 2) {
            koLearnCourseViewModel.modalType("createRecordFailedTooMany");
            koLearnCourseViewModel.alertModal.show(
              function () {},
              function () {},
              function () {}
            );
            $("#lastStudySection2").text(self.name());

            self.localSaveRecord(ItemStudyRecordUpdateDTO);
          } else {
            self.createRecord(true, 5, chapterId);
          }
        }
        // try {
        //   self.heartbeat(self.heartbeatCallback);
        // } catch (e) {}

        record.pageRecords.removeAll();
        callbackSuccess && callbackSuccess();
        self.failTimes++;
        return;
      }

      for (var i = 0; i < record.pageRecords().length; i++) {
        var pageRecord = record.pageRecords()[i];
        // 保存后将本次页面学习时间变成历史时间
        record.sectionStudyTime(
          record.sectionStudyTime() + pageRecord.studyTime()
        );
        pageRecord.lastStudyTime += pageRecord.studyTime();
        pageRecord.studyTime(0);
        pageRecord.studyTimer && pageRecord.studyTimer.reStartTiming();
        if (!isAutoSave) {
          pageRecord.hasLearned = false;
        }

        for (var j = 0; j < pageRecord.videoRecords().length; j++) {
          var videoRecord = pageRecord.videoRecords()[j];
          videoRecord.lastViewTime = videoRecord.viewTime();
          try {
            if (videoRecord.startEndTimeList.length > 0) {
              if (!isAutoSave) {
                videoRecord.startEndTimeList.splice(
                  0,
                  videoRecord.startEndTimeList.length
                );
              } else {
                videoRecord.startEndTimeList.splice(
                  0,
                  videoRecord.startEndTimeList.length - 1
                );
                videoRecord.startEndTimeList[0].startTime =
                  videoRecord.startEndTimeList[0].endTime;
              }
            }
          } catch (error) {}
        }
      }
      for (var i = 0; i < self.pages().length; i++) {
        var page = self.pages()[i];

        for (var j = 0; j < page.pageElements().length; j++) {
          var pageElement = page.pageElements()[j];

          pageElement.submitTimes(0);
        }
      }

      record.pageRecords.removeAll();
      callbackSuccess && callbackSuccess();

      window.debugMode &&
        console.log("节(" + self.name() + ")保存学习记录成功");
      self.failTimes = 0;

      window.saveTo3rd();
      window.save3rdRecord();
    }

    // console.log(ItemStudyRecordUpdateDTO)
    // if (!window.appMode) {
    var url = "/studyrecord/item";
    var brower = BrowserType();
    if (brower == "IE9" || brower == "IE8") {
      url = "/studyrecord/itemforie";
      isAsync = true;
    }
    url = "/yws/api/personal/sync";
    var data = CryptoJS.DES.encrypt(
      ko.toJSON(ItemStudyRecordUpdateDTO),
      CryptoJS.enc.Utf8.parse("12345678"), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }
    ).toString();
    // console.log(JSON.parse(ko.toJSON(ItemStudyRecordUpdateDTO)));
    var startTime = new Date().getTime();
    self.lastSaveRecordTime = startTime;
    $.ajax({
      url: CONFIG_API_HOST +
        url +
        "?courseType=" +
        (window.courseType == "xml" ? 1 : 4) +
        "&platform=" +
        (window.appMode ? "APP" : "PC") +
        (self.isTeacherDevelopment ? "&jftoken=" + getUrlParam('jftoken') + "&jfcallbackurl=" + getUrlParam('jfcallbackurl') : ''),
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      async: isAsync,
      timeout: isGoBack ? 10000 : 30000,
      data: data,
      success: function (result, status, xhr) {
        var responseTime = new Date().getTime() - startTime;
        if (responseTime > 20000) {
          // 记录慢响应
          self.logLongTimeResponse(responseTime);
        }
        handler(result, callbackSuccess, callbackError);
      },
      error: function (xhr, status, error) {
        record.pageRecords.removeAll();
        console.log("保存学习记录失败");

        var responseTime = new Date().getTime() - startTime;
        if (responseTime > 20000) {
          // 记录慢响应
          self.logLongTimeResponse(responseTime);
        }

        if (isGoBack) {
          if (self.failTimes > 2) {
            self.localSaveRecord(ItemStudyRecordUpdateDTO);
            callbackError && callbackError(1);
          } else {
            koLearnCourseViewModel.modalType("goBackCreateRecordFailed");
            koLearnCourseViewModel.alertModal.show(
              function () {},
              function () {
                self.localSaveRecord(ItemStudyRecordUpdateDTO);
                callbackError && callbackError(1);
              },
              function () {}
            );
          }
        } else {
          // stopAllMedia();
          // koLearnCourseViewModel.modalType("createRecordFailed");
          // koLearnCourseViewModel.alertModal.show(function() {}, function() {
          //   // 重发
          //   self.createRecord(true, 5, chapterId);
          // }, function() {});
          // $("#lastStudySection").text(self.name());
          if (self.failTimes > 2) {
            koLearnCourseViewModel.modalType("createRecordFailedTooMany");
            koLearnCourseViewModel.alertModal.show(
              function () {},
              function () {},
              function () {}
            );
            $("#lastStudySection2").text(self.name());

            self.localSaveRecord(ItemStudyRecordUpdateDTO);
          } else {
            self.createRecord(true, 5, chapterId);
          }
        }
        self.failTimes++;

        callbackError && callbackError();
      },
    });
    // } else {
    //   ItemStudyRecordUpdateDTO.chapterId = chapterId;
    //   ItemStudyRecordUpdateDTO.sectionId = ItemStudyRecordUpdateDTO.itemid;
    //   delete ItemStudyRecordUpdateDTO.itemid;
    //   ItemStudyRecordUpdateDTO.sectionStudyTime = sectionProgress.totalStudyTime;
    //   ItemStudyRecordUpdateDTO.sectionScore = ItemStudyRecordUpdateDTO.score;
    //   delete ItemStudyRecordUpdateDTO.score;
    //   ItemStudyRecordUpdateDTO.sectionCompletionStatus = ItemStudyRecordUpdateDTO.complete;
    //   delete ItemStudyRecordUpdateDTO.complete;

    //   for (var i = 0; i < ItemStudyRecordUpdateDTO.pageStudyRecordDTOList.length; i++) {
    //     var pageRecord = ItemStudyRecordUpdateDTO.pageStudyRecordDTOList[i];
    //     pageRecord.version = ItemStudyRecordUpdateDTO.version;
    //   }

    //   // console.log(ItemStudyRecordUpdateDTO);
    //   window.CoursePlayer.saveOrUpdateRecord(ItemStudyRecordUpdateDTO, function() {
    //     handler(1, callbackSuccess);
    //   });
    // }
  };

  // 本地缓存提交失败的学习记录
  Section.prototype.localSaveRecord = function (record) {
    var self = this;

    if (typeof Storage !== "undefined" && window.currentUserId) {
      var failureRecord = localStorage.failureRecord ?
        localStorage.failureRecord : {};
      try {
        failureRecord = JSON.parse(failureRecord);
      } catch (e) {
        failureRecord = {};
      }

      failureRecord[window.currentUserId] = failureRecord[window.currentUserId] ?
        failureRecord[window.currentUserId] : {};
      failureRecord[window.currentUserId][self.id()] = {
        name: self.name(),
        param: "?courseType=" +
          (window.courseType == "xml" ? 1 : 4) +
          "&platform=" +
          (window.appMode ? "APP" : "PC"),
        record: record,
      };
      localStorage.failureRecord = JSON.stringify(failureRecord);
    } else {
      // 抱歉! 不支持 web 存储。
    }
  };

  Section.prototype.calculateProgress = function () {
    var section = this;
    var totalScore = 0;
    var totalStudyTime = section.record().sectionStudyTime();
    // var totalStudyTime = 0;
    var sectionProgress = 0;

    var pageNum = 0;
    var completePageNum = 0;
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
      totalStudyTime += pageRecord.studyTime();
      // 因为老学习记录有问题，所以节的学习时长按照学习记录中的节时长加上本次每页学习时长来算
      // totalStudyTime += pageRecord.studyTime() + pageRecord.lastStudyTime;
    }

    try {
      if (pageNum == 0) {
        totalScore = 0;
      } else {
        totalScore = parseInt(totalScore / pageNum);
      }
    } catch (e) {}
    try {
      section.record().status(completePageNum == pageNum ? 1 : 0);
      if (pageNum == 0) {
        sectionProgress = completePageNum == pageNum ? 100 : 0;
      } else {
        sectionProgress = ((completePageNum * 100.0) / pageNum).toFixed(0);
      }
    } catch (e) {}

    return {
      totalScore: totalScore,
      totalStudyTime: totalStudyTime,
      sectionProgress: sectionProgress,
    };
  };

  Section.prototype.reSendRecord = function (record, courseType, platform) {
    record.autoSave = 5;

    // 处理旧版记录
    try {
      for (var i = 0; i < record.pageStudyRecordDTOList.length; i++) {
        var page = record.pageStudyRecordDTOList[i];

        if (!page.submitTimes) {
          page.submitTimes = 0;
        }
      }
    } catch (e) {}

    var url = "/yws/api/personal/sync";
    var data = CryptoJS.DES.encrypt(
      ko.toJSON(record),
      CryptoJS.enc.Utf8.parse("12345678"), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      }
    ).toString();
    // console.log(ko.toJSON(ItemStudyRecordUpdateDTO));
    $.ajax({
      url: CONFIG_API_HOST +
        url +
        "?courseType=" +
        courseType +
        "&platform=" +
        platform
        + (self.isTeacherDevelopment ? "&jftoken=" + getUrlParam('jftoken') + "&jfcallbackurl=" + getUrlParam('jfcallbackurl') : ''),
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: data,
      success: function (result, status, xhr) {
        if (result == 1) {
          alert("恢复成功");
        } else {
          alert("恢复失败，数据一致性问题");
        }
      },
      error: function (xhr, status, error) {
        alert("调用接口失败");

        callbackError && callbackError();
      },
    });
  };

  Section.prototype.deleteRecord = function (callbackSuccess, callbackError) {
    var self = this;

    $.ajax({
      url: CONFIG_API_HOST + "/studyrecord/item?itemId=" + self.id(),
      type: "DELETE",
      contentType: "application/json",
      dataType: "json",
      async: true,
      success: function (result, status, xhr) {
        callbackSuccess && callbackSuccess();
      },
      error: function (xhr, status, error) {
        callbackError && callbackError();
      },
    });
  };

  Section.prototype.logLongTimeResponse = function (time) {
    var self = this;

    $.ajax({
      url: CONFIG_API_HOST + "/studyrecord/timeout/log",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: JSON.stringify({
        time: time,
        itemId: self.id(),
        platform: window.appMode ? "APP" : "PC",
      }),
      success: function (result, status, xhr) {},
      error: function (xhr, status, error) {},
    });
  };

  return Section;
});