// Main viewmodel class
define(['knockout', "i18n!nls/public", "i18n!nls/course", "i18n!nls/classroom", "i18n!nls/reponsitory", "i18n!nls/index", '../common/js/ko-i18n', 'text', 'JqueryMessage', 'JqueryValidatorUserExtend'], function (ko, public18nText, course18nText, classroom18nText, reponsitory18nText, index18nText) {
  function mainController() {
    var self = this;
    self.public18nText = public18nText;
    
    self.addHover = ko.observable(1)
    self.UMOOC_SERVER_HOST = UMOOC_SERVER_HOST;
    self.UMOOC_COOKIE_DOMAIN = UMOOC_COOKIE_DOMAIN;
    self.UA_WEB_HOST = UA_WEB_HOST
    self.UTEST_WEB_HOST = UTEST_WEB_HOST
    self.KOUYU_WEB_HOST = KOUYU_WEB_HOST
    self.SJJX_WEB_HOST = SJJX_WEB_HOST
    self.KG_WEB_HOST = KG_WEB_HOST

    if (!window.location.hash) {
      window.location.hash = "#/index/portal";
    }

    var saveStudyRecordBeforeLeavePage;

    function setSaveStudyRecordBeforeLeavePage(callback) {
      saveStudyRecordBeforeLeavePage = callback;
    }

    // 监听搜索框回车事件
    $("body").on("keydown", ".input-search-group .text-input", function () {
      if (event.keyCode && event.keyCode == 13) {
        $(this).siblings().click();
      }
    });

    self.routingRules = {
      "/index": {
        rule: {
          template: {
            require: "text!module/index/index.html",
          },
          viewModel: {
            require: "module/index/indexController",
          },
        },
        title: self.public18nText.ulearning || "优学院",
        params: {},
      },
      
      // /index/asia原来是/index下的子路由，现在要将路由提升，但是为了不改变url，故保留原来的路由路径
      "/i18n": {
        rule: {
          template: {
            require: "text!module/asia/index.html",
          },
          viewModel: {
            require: "module/asia/controller",
          },
        },
        title: self.public18nText.ulearning || "优学院",
        params: {},
      },
      "/course": {
        rule: {
          template: {
            require: "text!module/course/course.html",
          },
          viewModel: {
            require: "module/course/courseController",
          },
        },
        title: self.public18nText.ulearning || "优学院",
        params: {},
        // after: function () {
        //   var oMeta = document.createElement('meta');
        //   oMeta.content = 'width=device-width, initial-scale=1';
        //   oMeta.name = 'viewport';
        //   document.getElementsByTagName('head')[0].appendChild(oMeta);
        // }
      },
      "/dataCenter": {
        rule: {
          template: {
            require: "text!module/course/dataCenter.html",
          },
          viewModel: {
            require: "module/course/courseController",
          },
        },
        title: self.public18nText.ulearning || "优学院",
        params: {},
      },
      "/user": {
        rule: {
          template: {
            require: "text!module/user/userInfo.html",
          },
          viewModel: {
            require: "module/user/userController",
          },
        },
        title: self.public18nText.personalPage || "个人资料",
        params: {},
      },
      "/eportfolio/preview": {
        rule: {
          template: {
            require: "text!module/user/eportfolio/preview/preview.html",
          },
          viewModel: {
            require: "module/user/eportfolio/preview/previewController",
          },
        },
        title: self.public18nText.previewEportfolio || "预览档案",
        params: {},
      },
      "/eportfolio/homePage": {
        rule: {
          template: {
            require: "text!module/user/eportfolio/homePage/homePage.html",
          },
          viewModel: {
            require: "module/user/eportfolio/homePage/homePageController",
          },
        },
        title: self.public18nText.personalHomepage || "个人主页",
        params: {},
      },
      "/eportfolio": {
        rule: {
          template: {
            require: "text!module/user/eportfolio/eportfolio.html",
          },
          viewModel: {
            require: "module/user/eportfolio/eportfolioController",
          },
        },
        title: self.public18nText.studyEportfolio || "学业档案",
        params: {},
      },
      "/announcement": {
        rule: {
          template: {
            require: "text!module/announcement/announcement.html",
          },
          viewModel: {
            require: "module/announcement/announcementController",
          },
        },
        title: self.public18nText.announcement || "公告",
        params: {},
      },
      "/order": {
        rule: {
          template: {
            require: "text!module/order/order.html",
          },
          viewModel: {
            require: "module/order/orderController",
          },
        },
        title: self.public18nText.myOrder || "我的订单",
        params: {},
      },
      "/learning": {
        rule: {
          template: {
            require: "text!module/learning/learning.html",
          },
          viewModel: {
            require: "module/learning/learningController",
          },
        },
        title: self.public18nText.ulearning || "优学院",
        params: {
          setSaveStudyRecordBeforeLeavePage: setSaveStudyRecordBeforeLeavePage,
        },
        after: function () {
          saveStudyRecordBeforeLeavePage && saveStudyRecordBeforeLeavePage();
        },
      },
      "/perfectCourse": {
        rule: {
          template: {
            require:
              "text!module/index/courseList/perfectCourse/perfectCourse.html",
          },
          viewModel: {
            require:
              "module/index/courseList/perfectCourse/perfectCourseController",
          },
        },
        title: self.public18nText.improveCourse || "完善课程",
        params: {},
      },
      "/teachingProcess": {
        rule: {
          template: {
            require:
              "text!module/index/courseList/teachingProcess/teachingProcess.html",
          },
          viewModel: {
            require:
              "module/index/courseList/teachingProcess/teachingProcessController",
          },
        },
        title: self.public18nText.teachingProcess || "教学流程图示",
        params: {},
      },
      "/textbook/teachingPlan": {
        rule: {
          template: {
            require:
              "text!module/course/textbook/teachingPlan/teachingPlan.html",
          },
          viewModel: {
            require:
              "module/course/textbook/teachingPlan/teachingPlanController",
          },
        },
        title: self.public18nText.studyPlan || "学习计划",
        params: {},
      },
      "/textbook/learningProgress": {
        rule: {
          template: {
            require:
              "text!module/course/textbook/learningProgress/learningProgress.html",
          },
          viewModel: {
            require:
              "module/course/textbook/learningProgress/learningProgressController",
          },
        },
        title: self.public18nText.studyProgress || "学习进度",
        params: {},
      },
      "/textbook/myTextbook": {
        rule: {
          template: {
            require: "text!module/course/textbook/myTextbook/myTextbook.html",
          },
          viewModel: {
            require: "module/course/textbook/myTextbook/myTextbookController",
          },
        },
        title: self.public18nText.myTextbook || "我的教材",
        params: {},
      },
      "/exam": {
        rule: {
          template: {
            require: "text!module/course/exam/wrapper/wrapper.html",
          },
          viewModel: {
            require: "module/course/exam/wrapper/wrapperController",
          },
        },
        title: self.public18nText.exam || "考试",
        params: {},
      },
      "/room": {
        rule: {
          template: {
            require: "text!module/course/exam/roomEditor/roomEditor.html",
          },
          viewModel: {
            require: "module/course/exam/roomEditor/roomEditorController",
          },
        },
        title: self.public18nText.arrangingExamRoom || "编排考场",
        params: {},
      },
      "/exam/statistic": {
        rule: {
          template: {
            require: "text!module/course/exam/statistic/statistic.html",
          },
          viewModel: {
            require: "module/course/exam/statistic/statisticController",
          },
        },
        title: self.public18nText.studyStatistics || "成绩统计",
        params: {},
      },
      "/exam/setting": {
        rule: {
          template: {
            require: "text!module/course/exam/setting/setting.html",
          },
          viewModel: {
            require: "module/course/exam/setting/settingController",
          },
        },
        title: self.public18nText.exam || "考试",
        params: {},
      },
      "/exam/randomQuestions": {
        rule: {
          template: {
            require:
              "text!module/course/exam/randomQuestions/randomQuestions.html",
          },
          viewModel: {
            require:
              "module/course/exam/randomQuestions/randomQuestionsController",
          },
        },
        title: self.public18nText.randomGroupPaper || "随机组卷",
        params: {},
      },
      "/exam/autoPaper": {
        rule: {
          template: {
            require:
              "text!module/course/exam/randomQuestions/randomQuestions.html",
          },
          viewModel: {
            require:
              "module/course/exam/randomQuestions/randomQuestionsController",
          },
        },
        title: self.public18nText.autoGroupPaper || "自动组卷",
        params: {
          mode: 1,
        },
      },
      "/faceAuthentication": {
        rule: {
          template: {
            require:
              "text!module/course/exam/faceAuthentication/faceAuthentication.html",
          },
          viewModel: {
            require:
              "module/course/exam/faceAuthentication/faceAuthenticationController",
          },
        },
        title: self.public18nText.faceAuthentication || "人脸认证",
        params: {},
      },
      "/exam/testAnalysis": {
        rule: {
          template: {
            require: "text!module/course/exam/testAnalysis/testAnalysis.html",
          },
          viewModel: {
            require: "module/course/exam/testAnalysis/testAnalysisController",
          },
        },
        title: self.public18nText.questionAnalysis || "试题分析",
        params: {},
      },
      "/exam/batchRemark": {
        rule: {
          template: {
            require: "text!module/course/exam/batchRemark/batchRemark.html",
          },
          viewModel: {
            require: "module/course/exam/batchRemark/batchRemarkController",
          },
        },
        title: self.public18nText.batchRemarkQue || "批量批阅试题",
        params: {},
      },
      "/exam/paperLibrary": {
        rule: {
          template: {
            require: "text!module/repository/paperLibrary/paperLibrary.html",
          },
          viewModel: {
            require: "module/repository/paperLibrary/paperLibraryController",
          },
        },
        title: self.public18nText.examPaperLibrary || "试卷库",
        params: {},
      },
      "/exam/monitor": {
        rule: {
          template: {
            require: "text!module/course/exam/monitor/monitor.html",
          },
          viewModel: {
            require: "module/course/exam/monitor/monitorController",
          },
        },
        title: self.public18nText.monitor || "监控台",
        params: {},
      },
      "/exam/photoAudit": {
        rule: {
          template: {
            require: "text!module/course/exam/photoAudit/photoAudit.html",
          },
          viewModel: {
            require: "module/course/exam/photoAudit/photoAuditController",
          },
        },
        title:
          self.public18nText.faceVerificationPhotoVerify || "人脸认证照片审核",
        params: {},
      },
      "/face/photoAudit": {
        rule: {
          template: {
            require: "text!module/course/face/photoAudit/photoAudit.html",
          },
          viewModel: {
            require: "module/course/face/photoAudit/photoAuditController",
          },
        },
        title:
          self.public18nText.faceVerificationPhotoVerify || "人脸认证照片审核",
        params: {},
      },
      "/joinCourse/spoc": {
        rule: {
          template: {
            require: "text!module/index/courseList/joinCourse/joinCourse.html",
          },
          viewModel: {
            require: "module/index/courseList/joinCourse/joinCourseController",
          },
        },
        title: self.public18nText.joinCourse || "加入班课",
        params: {},
      },
      "/group/classGroup": {
        rule: {
          template: {
            require:
              "text!module/course/courseMemberSpoc/classGroup/classGroup.html",
          },
          viewModel: {
            require:
              "module/course/courseMemberSpoc/classGroup/classGroupController",
          },
        },
        title: self.public18nText.classDivideGroup || "班级分组",
        params: {},
      },
      "/resource/statistics": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/resourceStatistics/resourceStatistics.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/resourceStatistics/resourceStatisticsController",
          },
        },
        title: self.public18nText.resourceStatistic || "资源统计",
      },
      "/resource/preview": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/resourcePreview/resourcePreview.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/resourcePreview/resourcePreviewController",
          },
        },
        title: self.public18nText.resourcePreview || "资源预览",
      },
      "/resource/import": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/resourceImport/resourceImport.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/resourceImport/resourceImportController",
          },
        },
        title: self.public18nText.resourceImport || "资源导入",
      },
      "/resource/publish": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/resourcePublish/resourcePublish.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/resourcePublish/resourcePublishController",
          },
        },
        title: self.public18nText.publishToCourse || "资源发布到课程", // 学科资源库发布到2.0的课程中
      },
      "/repository/resource": {
        rule: {
          template: {
            require: "text!module/repository/resourceLib/resourceLib.html",
          },
          viewModel: {
            require: "module/repository/resourceLib/resourceLibController",
          },
        },
        title: self.public18nText.resourceLibrary || "资源库",
      },
      "/microCourse": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/microCourse/microCourse.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/microCourse/microCourseController",
          },
        },
        title: course18nText.editMicroCourse || "编辑微课",
      },
      "/microPreview": {
        rule: {
          template: {
            require:
              "text!module/course/courseResource/microPreview/microPreview.html",
          },
          viewModel: {
            require:
              "module/course/courseResource/microPreview/microPreviewController",
          },
        },
        title: course18nText.viewMicroCourse || "微课预览",
      },
      "/help/env": {
        rule: {
          template: {
            require: "text!module/help/env/examEnv.html",
          },
          viewModel: {
            require: "module/help/env/examEnvController",
          },
        },
        title: self.public18nText.examEnvironmentDetection || "考试环境检测",
      },
      "/assessment/create": {
        rule: {
          template: {
            require: "text!module/course/courseAssessment/create/create.html",
          },
          viewModel: {
            require: "module/course/courseAssessment/create/createController",
          },
        },
        title: self.public18nText.createAssessment || "创建考核策略",
      },
      "/assessment/newCreate": {
        rule: {
          template: {
            require:
              "text!module/course/courseAssessment/newCreate/newCreate.html",
          },
          viewModel: {
            require:
              "module/course/courseAssessment/newCreate/newCreateController",
          },
        },
        title: self.public18nText.setAssesmentRules || "设置考核规则",
      },
      "/assessment/edit": {
        rule: {
          template: {
            require: "text!module/course/courseAssessment/create/create.html",
          },
          viewModel: {
            require: "module/course/courseAssessment/create/createController",
          },
        },
        title: self.public18nText.modifyAssessment || "修改考核策略",
      },
      "/assessment/viewScore": {
        rule: {
          template: {
            require:
              "text!module/course/courseAssessment/viewScore/viewScore.html",
          },
          viewModel: {
            require:
              "module/course/courseAssessment/viewScore/viewScoreController",
          },
        },
        title: self.public18nText.viewScore || "查看成绩",
      },
      "/certificate": {
        rule: {
          template: {
            require: "text!module/course/certificate/certificate.html",
          },
          viewModel: {
            require: "module/course/certificate/certificateController",
          },
        },
        title: self.public18nText.certificateManagement || "证书管理",
      },
      "/setCertificate": {
        rule: {
          template: {
            require:
              "text!module/course/certificate/setCertificate/setCertificate.html",
          },
          viewModel: {
            require:
              "module/course/certificate/setCertificate/setCertificateController",
          },
        },
        title: self.public18nText.certificateSettings || "证书设置",
      },
      "/myCertificateTemplate": {
        rule: {
          template: {
            require:
              "text!module/course/certificate/myCertificateTemplate/myCertificateTemplate.html",
          },
          viewModel: {
            require:
              "module/course/certificate/myCertificateTemplate/myCertificateTemplateController",
          },
        },
        title: self.public18nText.certificateTemplate || "我的证书模板",
      },

      /*myadd*/
      "/exam/exportHomeworkData": {
        rule: {
          template: {
            require:
              "text!module/course/exam/exportHomeworkData/newCreate.html",
          },
          viewModel: {
            require:
              "module/course/exam/exportHomeworkData/newCreateController",
          },
        },
        title: course18nText.exportHomeworkScoresInBatches,
      },
      "/exam/exportTestData": {
        rule: {
          template: {
            require:
              "text!module/course/exam/exportHomeworkData/newCreate.html",
          },
          viewModel: {
            require:
              "module/course/exam/exportHomeworkData/newCreateController",
          },
        },
        title: course18nText.exportTestScoresInBatches,
      },
      "/exam/exportLiveData": {
        rule: {
          template: {
            require:
              "text!module/course/exam/exportHomeworkData/newCreate.html",
          },
          viewModel: {
            require:
              "module/course/exam/exportHomeworkData/newCreateController",
          },
        },
        title: course18nText.exportLiveDataInBatches,
      },
      "/selectCertificate": {
        rule: {
          template: {
            require:
              "text!module/course/certificate/selectCertificateTemplate/selectCertificateTemplate.html",
          },
          viewModel: {
            require:
              "module/course/certificate/selectCertificateTemplate/selectCertificateTemplateController",
          },
        },
        title: self.public18nText.selectTemplate || "选择模板",
      },
      "/createCertificate": {
        rule: {
          template: {
            require:
              "text!module/course/certificate/createCertificate/createCertificate.html",
          },
          viewModel: {
            require:
              "module/course/certificate/createCertificate/createCertificateController",
          },
        },
        title: self.public18nText.createCertificate || "新建模板",
      },
      "/mobileWrite": {
        rule: {
          template: {
            require:
              "text!module/course/certificate/createCertificate/mobileWrite.html",
          },
          viewModel: {
            require:
              "module/course/certificate/createCertificate/mobileWrite.html",
          },
        },
        title: self.public18nText.electronicSignature || "电子签名",
      },
      "/analysisSpoc": {
        rule: {
          template: {
            require:
              "text!module/course/courseAnalysisSpoc/courseAnalysisSpoc.html",
          },
          viewModel: {
            require:
              "module/course/courseAnalysisSpoc/courseAnalysisSpocController",
          },
        },
        title: self.public18nText.courseAnalysis || "课程分析",
      },
      "/liveAnalysis": {
        rule: {
          template: {
            require: "text!module/course/liveAnalysis/index.html",
          },
          viewModel: {
            require: "module/course/liveAnalysis/controller",
          },
        },
        title: self.public18nText.liveAnalysis || "直播分析",
        params: {
          course: self.course,
        },
      },
      "/textbookContent": {
        rule: {
          template: {
            require: "text!module/course/textbook/courseTextbook.html",
          },
          viewModel: {
            require: "module/course/textbook/courseTextbookController",
          },
        },
        title: self.public18nText.coursewareContent || "课件内容",
      },
      "/live/playback": {
        rule: {
          template: {
            require: "text!module/course/courseLive/playback/playback.html",
          },
          viewModel: {
            require: "module/course/courseLive/playback/playbackController",
          },
        },
        title: self.public18nText.livePlayback || "直播回看",
        params: {},
      },
      "/live/setting": {
        rule: {
          template: {
            require: "text!module/course/courseLive/setting/setting.html",
          },
          viewModel: {
            require: "module/course/courseLive/setting/settingController",
          },
        },
        title: self.public18nText.live || "直播",
        params: {},
      },
      "/textbook/semester": {
        rule: {
          template: {
            require: "text!module/course/semester/semester.html",
          },
          viewModel: {
            require: "module/course/semester/semesterController",
          },
        },
        title: self.public18nText.semesterManagement || "学期管理",
        params: {},
      },
      "/member/foreignMember": {
        rule: {
          template: {
            require:
              "text!module/course/courseMemberSpoc/foreignMember/foreignMember.html",
          },
          viewModel: {
            require:
              "module/course/courseMemberSpoc/foreignMember/foreignMemberController",
          },
        },
        title: self.public18nText.foreignMember || "外校成员",
        params: {},
      },
      "/live/admin": {
        rule: {
          template: {
            require: "text!module/course/courseLive/liveAdmin/liveAdmin.html",
          },
          viewModel: {
            require: "module/course/courseLive/liveAdmin/liveAdminController",
          },
        },
        title: self.public18nText.liveManagement || "直播管理",
        params: {},
      },
      "/calendar": {
        rule: {
          template: {
            require: "text!module/calendar/calendar.html",
          },
          viewModel: {
            require: "module/calendar/calendarController",
          },
        },
        title: self.public18nText.activityCalendar || "活动日历",
        params: {},
      },
      "/iCourse/stat": {
        rule: {
          template: {
            require: "text!module/course/textbook/iCourseStat/iCourseStat.html",
          },
          viewModel: {
            require: "module/course/textbook/iCourseStat/iCourseStatController",
          },
        },
        title: course18nText.coursewareStat || "课件统计",
        params: {},
      },
      "/live/setting": {
        rule: {
          template: {
            require: "text!module/course/courseLive/setting/setting.html",
          },
          viewModel: {
            require: "module/course/courseLive/setting/settingController",
          },
        },
        title: course18nText.live || "直播",
        params: {},
      },
      "/live/teacherSetting": {
        rule: {
          template: {
            require: "text!module/course/courseLive/teacherSetting/setting.html",
          },
          viewModel: {
            require: "module/course/courseLive/teacherSetting/settingController",
          },
        },
        title: course18nText.live || "直播",
        params: {},
      },
      "/live/teacherPlayBack": {
        rule: {
          template: {
            require: "text!module/course/courseLive/teacherPlayBack/teacherPlayBack.html",
          },
          viewModel: {
            require: "module/course/courseLive/teacherPlayBack/teacherPlayBackController",
          },
        },
        title: course18nText.liveBack || "直播回放",
        params: {},
      },
      "/live/authorization": {
        rule: {
          template: {
            require: "text!module/course/courseLive/authorization/authorization.html",
          },
          viewModel: {
            require: "module/course/courseLive/authorization/authorizationController",
          },
        },
        title: "授权成功",
        params: {},
      },
      "/classroom/export": {
        rule: {
          template: {
            require: "text!module/course/classroom/export/export.html",
          },
          viewModel: {
            require: "module/course/classroom/export/exportController",
          },
        },
        title: classroom18nText.classroomReport || "课堂报告",
        params: {},
      },
      "/classroom/stuExport": {
        rule: {
          template: {
            require: "text!module/course/classroom/stuExport/stuExport.html",
          },
          viewModel: {
            require: "module/course/classroom/stuExport/stuExportController",
          },
        },
        title: classroom18nText.classroomReport || "课堂报告",
        params: {},
      },
      "/classroom/pointsRanking": {
        rule: {
          template: {
            require:
              "text!module/course/classroom/pointsRanking/pointsRanking.html",
          },
          viewModel: {
            require:
              "module/course/classroom/pointsRanking/pointsRankingController",
          },
        },
        title: classroom18nText.rankList || "积分排行",
        params: {},
      },
      "/playBack": {
        rule: {
          template: {
            require: "text!module/playBack/playBack.html",
          },
          viewModel: {
            require: "module/playBack/playBack",
          },
        },
        title: course18nText.liveBack || "直播回放",
      },
      "/obe": {
        rule: {
          template: {
            require: "text!module/course/courseAssessment/obe/obe.html",
          },
          viewModel: {
            require: "module/course/courseAssessment/obe/obeController",
          },
        },
        title: course18nText.courseGoal || "课程目标",
        params: {},
      },
      "/offline/grade": {
        rule: {
          template: {
            require: "text!module/course/courseAssessment/obe/grade/grade.html",
          },
          viewModel: {
            require: "module/course/courseAssessment/obe/grade/gradeController",
          },
        },
        title: course18nText.offlineActivityGrade || "线下活动成绩",
        params: {},
      },
      "/assessment/fileOfLearning": {
        rule: {
          template: {
            require:
              "text!module/course/courseAssessment/fileOfLearning/fileOfLearning.html",
          },
          viewModel: {
            require:
              "module/course/courseAssessment/fileOfLearning/fileOfLearningController",
          },
        },
        title: course18nText.fileOfLearning || "学习档案",
      },
      "/dictation/export": {
        rule: {
          template: {
            require:
              "text!module/course/dictation/dictationExport.html",
          },
          viewModel: {
            require:
              "module/course/dictation/dictationExportController",
          },
        },
        title: index18nText.wordsListenAndWrite || "单词听写",
        params: {},
      }
    };

    ko.components.register("ko-view", {
      template: {
        require: "text!../common/component/koView/koView.html",
      },
      viewModel: {
        require: "../common/component/koView/koView.js",
      },
    });
    ko.components.register("user-menu", {
      template: {
        require: "text!module/user/component/userMenu/userMenu.html",
      },
      viewModel: {
        require: "module/user/component/userMenu/userMenuController.js",
      },
    });
    ko.components.register("verify-code", {
      template: {
        require: "text!module/user/component/verifyCode/verifyCode.html",
      },
      viewModel: {
        require: "module/user/component/verifyCode/verifyCodeCtr.js",
      },
    });

    ko.components.register("i18n-menu", {
      template: {
        require: "text!component/i18nMenu/i18nMenu.html",
      },
      viewModel: {
        require: "component/i18nMenu/i18nMenu.js",
      },
    });
    ko.components.register("resource-link", {
      template: {
        require: "text!component/resource/resourceLink.html",
      },
      viewModel: {
        require: "component/resource/resourceLink.js",
      },
    });
    ko.components.register("resource-richtext", {
      template: {
        require: "text!component/resource/resourceRichtext.html",
      },
      viewModel: {
        require: "component/resource/resourceRichtext.js",
      },
    });
    ko.components.register("resource-file", {
      template: {
        require: "text!component/resource/resourceFile.html",
      },
      viewModel: {
        require: "component/resource/resourceFile.js",
      },
    });
    ko.components.register("resource-edit", {
      template: {
        require: "text!component/resource/resourceEdit.html",
      },
      viewModel: {
        require: "component/resource/resourceEdit.js",
      },
    });
    ko.components.register("resource-detail", {
      template: {
        require: "text!component/resource/resourceDetail.html",
      },
      viewModel: {
        require: "component/resource/resourceDetail.js",
      },
    });
    ko.components.register("announcement-dialog", {
      template: {
        require: "text!component/announcement/announcement.html",
      },
      viewModel: {
        require: "component/announcement/announcement.js",
      },
    });
    ko.components.register("classRoom-dialog", {
      template: {
        require: "text!component/classroom/classroom.html",
      },
      viewModel: {
        require: "component/classroom/classroom.js",
      },
    });
    ko.components.register("fixed-nav", {
      template: {
        require: "text!/ulearning/component/fixedNav/fixedNav.html",
      },
      viewModel: {
        require: "/ulearning/component/fixedNav/fixedNav.js",
      },
    });
    ko.components.register("question-element-component", {
      template: {
        require:
          "text!/ulearning/component/questionElementView/questionElementView.html",
      },
      viewModel: {
        require:
          "/ulearning/component/questionElementView/questionElementView.js",
      },
    });

    ko.components.register("export-analysis", {
      template: {
        require: "text!/ulearning/component/exportAnalysis/exportAnalysis.html",
      },
      viewModel: {
        require: "/ulearning/component/exportAnalysis/exportAnalysis.js",
      },
    });

    ko.components.register("file-preview", {
      template: {
        require: "text!/ulearning/component/filePreview/filePreview.html",
      },
      viewModel: {
        require: "/ulearning/component/filePreview/filePreview.js",
      },
    });

    ko.components.register("student-certificate", {
      template: {
        require:
          "text!/ulearning/component/studentCertificate/studentCertificate.html",
      },
      viewModel: {
        require:
          "/ulearning/component/studentCertificate/studentCertificate.js",
      },
    });

    ko.components.register("voucher", {
      template: {
        require: "text!/ulearning/component/voucher/voucher.html",
      },
      viewModel: {
        require: "/ulearning/component/voucher/voucher.js",
      },
    });
    ko.components.register("voucherCustom", {
      template: {
        require: "text!/ulearning/component/voucherCustom/voucherCustom.html",
      },
      viewModel: {
        require: "/ulearning/component/voucherCustom/voucherCustom.js",
      },
    });
    ko.components.register("stuVoucher", {
      template: {
        require: "text!/ulearning/component/stuVoucher/stuVoucher.html",
      },
      viewModel: {
        require: "/ulearning/component/stuVoucher/stuVoucher.js",
      },
    });

    ko.components.register("behavior-trace-modal", {
      template: {
        require:
          "text!/ulearning/component/behaviorTraceModal/behaviorTraceModal.html",
      },
      viewModel: {
        require:
          "/ulearning/component/behaviorTraceModal/behaviorTraceModal.js",
      },
    });

    ko.components.register("resource-preview", {
      template: {
        require: "text!component/resource/resourcePreview.html",
      },
      viewModel: {
        require: "component/resource/resourcePreview.js",
      },
    });

    ko.components.register("attachment-preview", {
      template: {
        require: "text!component/attachment/preview.html",
      },
      viewModel: {
        require: "component/attachment/preview.js",
      },
    });


    (function init() {
      // 根据是否是触摸设备添加hover类(1:是,0:否)
      if (isTouchable()) {
          self.addHover(0)
        } 
    })();
  }
  return mainController;
});
