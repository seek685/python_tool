define(["knockout", "model/PageElement", "tools/Timer"], function (
  ko,
  PageElement,
  Timer
) {
  function Page(id, relationId, name, contentType, isHide, isAudition) {
    this.id = ko.observable(id);
    this.relationId = ko.observable(relationId); // 用于保存学习记录的页面id
    this.originId = ko.observable(id);
    this.name = ko.observable(name);
    this.contentType = ko.observable(contentType); // 页面内容类型 5图文 6视频 7练习
    this.isHide = ko.observable(isHide); // 是否被隐藏
    this.isAudition = ko.observable(isAudition); // 是否可试听
    this.type = ko.observable(0); // 页面类型

    this.pageElements = ko.observableArray();

    this.sort;
    this.isLoaded = ko.observable(false);
    this.loadFailed = ko.observable(false);
    this.isVisited = ko.observable(false);
    this.record = ko.observable(new Page.PageRecord(null, relationId));
    this.studyTimer;

    if (typeof Page._initialized == "undefined") {
      Page.prototype.showName = function () {
        console.log(this.name);
      };

      Page._initialized = true;
    }
  }
  Page.PageRecord = function (
    id,
    pageId,
    studyTime,
    status,
    score,
    answerTime
  ) {
    this.id = ko.observable(id);
    this.pageId = ko.observable(pageId);
    this.studyTime = ko.observable(studyTime ? studyTime : 0); // 学习时间
    this.status = ko.observable(status); // 学习状态 0未完成 1完成
    this.score = ko.observable(score ? score : 0);
    this.answerTime = ko.observable(answerTime); // 限时答题页面答题时间

    this.coursepageId = ko.observable(); // 练习页面保存练习组件id
    this.questionRecords = ko.observableArray();
    this.videoRecords = ko.observableArray();
    this.oralRecords = ko.observableArray();

    this.hasLearned = false;
    this.lastStudyTime = 0;
    this.questionRecordMap;
    this.videoRecordMap;
    this.submitTimes = 0;
  };

  Page.prototype.reterievePage = function (
    isPreviewMode,
    isAuthorPreview,
    isAuditionMode,
    callbackSuccess,
    callbackError
  ) {
    var self = this;
    var pageId;
    pageId = self.id();

    var restUrl;
    if (isAuthorPreview) {
      restUrl = "/wholepage/";
    } else {
      restUrl = "/wholepage/stu/";
    }
    if (isAuditionMode) {
      restUrl = "/wholepage/all/";
    }
    var url = CONFIG_API_HOST + restUrl + pageId
    if (isPreviewMode) {
      url += '?preview=1'
    }
    $.ajax({
      url: url,
      type: "GET",
      contentType: "application/json",
      dataType: "json",
      async: true,
      data: null,
      success: function (result, status, xhr) {
        self.adaptPage(result);

        callbackSuccess && callbackSuccess();
      },
      error: function (xhr, status, error) {
        // self.isLoaded(true);
        self.loadFailed(true);
        console.log(status);
        callbackError && callbackError();
      },
    });
  };

  Page.prototype.adaptPage = function (pageDTO) {
    var self = this;
    self.isLoaded(true);

    self.type(pageDTO.type);
    if (window.courseType == "xml") {
      self.contentType(pageDTO.type);
    }

    self.pageElements.removeAll();
    var videoIndex = 0;
    for (
      var i = 0;
      pageDTO.coursepageDTOList && i < pageDTO.coursepageDTOList.length;
      i++
    ) {
      var pe = pageDTO.coursepageDTOList[i];
      // pe.answerTime = 100;
      if (window.courseType == "xml" && pe.type == 4) {
        pe.resourceid = videoIndex++;
      }
      var pageElement = new PageElement(
        pe.coursepageDTOid,
        pe.type,
        pe.content,
        pe.note,
        pe.resourceid,
        pe.answertime,
        pe.answerquestion,
        pe.srtDTO,
        pe,
        pe.docSize,
        pe.docTitle,
        self.id(),
        self.originId()
      );
      pageElement.appRolePlayData = pe;

      if (pe.type == 6) {
        self.record().coursepageId(pe.coursepageDTOid);
        if (window.courseType == "xml") {
          // 设置xml习题答题次数
          pageElement.questionManyChance = pe.questionManyChance;
        }
      }

      var isEmpty = pageElement.adaptPageElement(pe);
      if (isEmpty) {
        continue;
      }

      self.pageElements.push(pageElement);
    }
  };

  Page.prototype.adaptPageNewParam = function (pageDTO) {
    var self = this;

    for (
      var i = 0;
      pageDTO.coursepageDTOList && i < pageDTO.coursepageDTOList.length;
      i++
    ) {
      var pe = pageDTO.coursepageDTOList[i];

      for (var j = 0; self.pageElements().length; j++) {
        var pageElement = self.pageElements()[j];

        if (pageElement.id() == pe.coursepageDTOid) {
          pageElement.answerChance(pe.answerquestion);
          if (pageElement.type() == 10 || pageElement.type() == 4) {
            pageElement.rolePlayData(pe);
          }

          if (pe.srtDTO && pe.srtDTO.srtType >= 0 && pageElement.trackArg()) {
            pageElement.trackArg().srtType = pe.srtDTO.srtType;
          }
          break;
        }
      }
    }
  };

  Page.prototype.adaptRecord = function (record) {
    if (!record) {
      return;
    }
    var self = this;
    var pageRecord = self.record();
    pageRecord.id(record.id);
    pageRecord.pageId(record.pageid);
    // pageRecord.studyTime(record.studyTime);
    pageRecord.lastStudyTime = record.studyTime;
    pageRecord.status(record.complete);
    pageRecord.score(record.score);
    pageRecord.answerTime(record.answerTime);

    var videoRecordMap = {};
    for (var i = 0; record.videos && i < record.videos.length; i++) {
      var videoRecord = record.videos[i];
      videoRecordMap[videoRecord.videoid] = videoRecord;
    }
    pageRecord.videoRecordMap = videoRecordMap;

    var questionRecordMap = {};
    for (var i = 0; record.questions && i < record.questions.length; i++) {
      var questionRecord = record.questions[i];
      questionRecordMap[questionRecord.questionid] = questionRecord;
    }
    pageRecord.questionRecordMap = questionRecordMap;

    var oralEnglishRecordMap = {};
    for (var i = 0; record.speaks && i < record.speaks.length; i++) {
      var oralEnglishRecord = record.speaks[i];
      oralEnglishRecordMap[oralEnglishRecord.speakingid] = oralEnglishRecord;
    }
    pageRecord.oralEnglishRecordMap = oralEnglishRecordMap;

    for (var i = 0; i < self.pageElements().length; i++) {
      var pageElement = self.pageElements()[i];

      switch (pageElement.type()) {
        case 4:
          pageElement.adaptRecord(
            pageRecord.videoRecordMap[pageElement.resourceId()]
          );
          break;
        case 6:
          if (pageElement.id() != record.coursepageId) {
            record.submitTimes = 0;
          }
          pageElement.adaptRecord(
            pageRecord.questionRecordMap,
            record.submitTimes
          );
          break;
        case 16:
          pageElement.adaptRecord(pageRecord.oralEnglishRecordMap);
          break;
        default:
      }
    }
  };

  Page.prototype.showRecord = function (record) {
    var self = this;
    for (var i = 0; i < self.pageElements().length; i++) {
      var pageElement = self.pageElements()[i];

      pageElement.showRecord();
    }
  };

  Page.prototype.getRecord = function () {
    var self = this;
    if (!self.isLoaded()) {
      self.record().hasLearned = false;
      return self.record();
    }
    var record = self.record();
    // 是否学习完毕
    var status = 1;
    // 得分
    var score = 0;
    var hasQuestion = false;
    var hasStarted = false;
    var hasOralItem = false;
    var questionIncomplete = false,
      oralIncomplete = false;
    // 如果有一个组件或习题没有学完，就不算学完这一页
    record.videoRecords.removeAll();
    record.questionRecords.removeAll();
    record.oralRecords.removeAll();
    for (var i = 0; i < self.pageElements().length; i++) {
      var pe = self.pageElements()[i];
      if (pe.type() == 6) {
        hasQuestion = true;
      }
    }
    for (var i = 0; i < self.pageElements().length; i++) {
      var pageElement = self.pageElements()[i];
      switch (pageElement.type()) {
        case 4:
          var videoRecord = pageElement.getRecord();
          if (videoRecord.hasLearned) {
            record.videoRecords().push(videoRecord);
            // videoRecord.hasLearned = false;
          }
          if (!videoRecord.status() && !hasQuestion) {
            status = 0;
          }
          break;
        case 6:
          hasQuestion = true;
          hasStarted = hasStarted ? hasStarted : pageElement.hasStarted();
          var questionRecords = pageElement.getRecord();
          record.submitTimes = questionRecords.submitTimes;
          for (var j = 0; j < questionRecords.length; j++) {
            var questionRecord = questionRecords[j];
            if (questionRecord.hasLearned) {
              record.questionRecords().push(questionRecord);
              // questionRecord.hasLearned = false;
            }
            score += questionRecord.userScore()
              ? questionRecord.userScore()
              : 0;
            if (!questionRecord.status()) {
              status = 0;
              questionIncomplete = true;
            }
          }
          if (questionIncomplete) {
            record.questionRecords([]);
          }
          break;
        case 16:
          hasOralItem = true;
          hasStarted = hasStarted ? hasStarted : pageElement.hasStarted();
          var oralEnglishRecords = pageElement.getRecord();
          for (var j = 0; j < oralEnglishRecords.length; j++) {
            var oralRecord = oralEnglishRecords[j];
            if (oralRecord.hasLearned) {
              record.oralRecords().push(oralRecord);
            }
            score += oralRecord.score();
            if (!oralRecord.status()) {
              status = 0;
              oralIncomplete = true;
            }
          }
          break;
        default:
      }
    }

    if (record.hasLearned) {
      record.status(record.status() || status);
    }
    if (hasOralItem) {
      record.status(record.status() || (oralIncomplete ? 0 : 1));
    } else if (!hasQuestion) {
      // 非习题页面满分100
      score = record.status() ? 100 : 0;
    } else {
      record.status(record.status() || (questionIncomplete ? 0 : 1));
    }

    // xml课程页面分数转换为百分制
    var pageScore = score;
    var pageTotalScore = self.getTotalScore();
    // 习题页面最终得分按照 本页得分/练习总分*100.0向下取整
    if (pageTotalScore != 100) {
      try {
        if (pageTotalScore != 0) {
          pageScore = parseInt((100.0 * pageScore) / pageTotalScore);
        } else {
          pageScore = 0;
        }
      } catch (e) {}
    }

    record.score(pageScore);

    self.hasQuestion = hasQuestion;
    self.hasOralItem = hasOralItem;
    self.hasStarted = hasStarted;
    self.questionIncomplete = questionIncomplete;
    self.oralIncomplete = oralIncomplete;

    return self.record();
  };

  Page.prototype.startLearning = function () {
    var self = this;
    self.record().hasLearned = true;
    // self.studyTimer = new Timer(self.record().studyTime());
    // self.record().lastStudyTime += self.record().studyTime();
    self.studyTimer && self.studyTimer.stopTiming();
    self.studyTimer = new Timer(self.record().studyTime());
    self.record().studyTimer = self.studyTimer;
    self.studyTimer.startTiming(function (second) {
      self.record().studyTime(second);
    });
  };
  Page.prototype.stopLearning = function () {
    var self = this;
    self.studyTimer && self.studyTimer.stopTiming();
    window.debugMode &&
      console.log(
        "本页(" + self.name() + ")学了" + self.record().studyTime() + "秒"
      );
  };

  Page.prototype.getTotalScore = function () {
    var self = this;
    var score = 0;
    var hasQuestion = false;
    var hasOralItem = false;
    for (var i = 0; i < self.pageElements().length; i++) {
      var element = self.pageElements()[i];
      switch (element.type()) {
        case 6:
          // 习题
          hasQuestion = true;
          score += element.getQuestionTotalScore();
          break;
        case 16:
          hasOralItem = true;
          score += element.getOralTotalScore();
          break;
        default:
      }
    }
    if (!hasQuestion && !hasOralItem) {
      score = 100;
    }
    return score;
  };

  Page.prototype.getUserScore = function () {
    var self = this;
    var score = 0;
    var isComplete = 1;
    var hasQuestion = false;
    var hasOralItem = false;
    for (var i = 0; i < self.pageElements().length; i++) {
      var pageElement = self.pageElements()[i];
      if (pageElement.type() == 6) {
        hasQuestion = true;
      }
      if (pageElement.type() == 16) {
        hasOralItem = true;
      }
    }
    for (var i = 0; i < self.pageElements().length; i++) {
      var element = self.pageElements()[i];
      switch (element.type()) {
        case 4:
          // 视频
          isComplete = element.record().status() ? 1 : 0;
          if (!element.record().status() && !hasQuestion && !hasOralItem) {
            isComplete = 0;
          }
          break;
        case 6:
          // 习题
          score += element.getQuestionUserScore();
          if (!element.isQuestionComplete()) {
            isComplete = 0;
          }
          break;
        case 16:
          //口语评分
          score += element.getOralItemUserTotalScore();
          if (!element.isOralItemComplete()) {
            isComplete = 0;
          }
          break;
        default:
      }
    }
    if (!hasQuestion && !hasOralItem) {
      score = isComplete ? 100 : 0;
    }
    self.record().status(isComplete);
    self.record().score(score);
  };

  Page.prototype.getElementById = function (id) {
    var self = this;
    for (var i = 0; i < self.pageElements().length; i++) {
      var element = self.pageElements()[i];
      if (id == element.id()) {
        return element;
      }
    }
  };

  return Page;
});
