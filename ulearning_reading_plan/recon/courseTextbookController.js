// AMD module whose value is a component viewmodel constructor
define([
  "knockout",
  "Course",
  "Textbook",
  "Class",
  "Login",
  "Toast",
  "Dialog",
  "i18n!nls/course",
  "cssLoader!./courseTextbook",
], function (ko, Course, Textbook, Class, Login, Toast, Dialog, course18nText) {
  function courseTextbookController(params) {
    var self = this;
    window.test = this;
    self.course18nText = course18nText;
    var courseId = getHashParam("courseId");
    var textbookId2 = getHashParam("textbookId2");
    var classId = 0;
    var currentTextBook = null;
    self.isAisa = asiaVersion;
    self.buildStaticPath = buildStaticPath;
    // 完善课程的标记
    self.perfectCourseMode = ko.observable(!!getHashParam("perfect"));

    self.user = Login.user;


    var textbookId = getHashParam("textbookId");
    self.viewMode = ko.observable(); // chooseTextbook 无课件 viewTextbook 已有课件 studentView 学生视图
    self.isSingleTextbookMode = ko.observable(0); // 单个教材页面
    if (textbookId) {
      courseId = 0;
      self.isSingleTextbookMode(1);
    }

    self.course = params.params() ? params.params().course : new Course(0);

    // 国际化图片路径相关替换
    self.overdueUrl = "/common/img/stu_my_material_overdue.png";
    var locale = getCookie("lang") || "zh";
    switch (locale) {
      case "en":
      case "id":
      case "th":
      case "es":
      case "ar":
      case "tw":
        self.overdueUrl =
          "/common/img/i18n/" + locale + "/stu_my_material_overdue.png')";
    }

    self.showTeachingResourceBtn = !asiaVersion; // 是否显示教学资料按钮 海外版不显示

    self.insideTextbookList = ko.observableArray();
    self.outsideTextbookList = ko.observableArray();
    self.textbookList = ko.observableArray();
    self.myTextbookList = ko.observableArray();
    self.selectedTextbookList = ko.observableArray();
    self.chapterList = ko.observableArray();

    self.currentTextbook = ko.observable({});
    self.currentplatformType = ko.observable(1); // 1-电脑端 2-手机端
    self.searchKeyword = ko.observable("");

    self.UA_WEB_HOST = UA_WEB_HOST;
    self.currrentTextbookSource = ko.observable(0); // 0 全部  1我创建的  2 本校自建  3 外部引入
    self.textbookSourceList = ko.observableArray([
      self.course18nText.all || "全部",
      self.course18nText.myCreated || "我创建的",
      self.course18nText.ourSchoolBuilt || "本校自建",
      self.course18nText.outsideIntroduce || "外部引入",
    ]);
    self.iCourseTypeMap = ko.observable({
      '0': self.course18nText.all || "全部",
      '10': self.course18nText.videoCourse || "视频公开课",
      '9': self.course18nText.resourceCourse || "资源共享课",
      '11': "MOOC"
    });
    self.allTextbookList = ko.observableArray();

    self.activationCode = ko.observable("");

    self.buildCoverPath = buildCoverPath;

    self.isLoadingTextbook = ko.observable(0);
    self.isLoadingTextbookList = ko.observable(0);
    self.isLoadingViewMode = ko.observable(0);

    self.showScromTip = ko.observable(false);
    self.searchTextbook = function (callback, callbackError, flag) {
      var newTextbook = new Textbook();

      switch (self.user.roleId()) {
        case 8:
          self.isLoadingTextbookList(1);
          newTextbook.retrieveTeacherTextbookList(
            self.course.id(),
            self.searchKeyword(),
            function (result) {
              if (flag) {
                self.allTextbookList.removeAll();
                for (var i = 0; i < result.length; i++) {
                  var tb = result[i];
                  var textbook = new Textbook(tb.textbookId, tb.name, tb.type);
                  textbook.selected = ko.observable(tb.chosen == 1);
                  textbook.hasLoaded = ko.observable(false);
                  textbook.creator = ko.observable(tb.creator);
                  textbook.creatorName(tb.creatorName);
                  textbook.orgId(tb.orgId);
                  textbook.allowfreedomreg(tb.allowfreedomreg);
                  self.allTextbookList.push(textbook);
                }
                self.textbookList(self.allTextbookList());
              } else {
                self.textbookList.removeAll();
                var selfArr = [];
                var schoolArr = [];
                var outerArr = [];
                var allArr = [];
                for (var i = 0; i < result.length; i++) {
                  var tb = result[i];
                  var textbook = new Textbook(tb.textbookId, tb.name, tb.type);
                  textbook.selected = ko.observable(tb.chosen == 1);
                  textbook.hasLoaded = ko.observable(false);
                  textbook.creator = ko.observable(tb.creator);
                  textbook.creatorName(tb.creatorName);
                  textbook.orgId(tb.orgId);
                  textbook.allowfreedomreg(tb.allowfreedomreg);
                  if (
                    self.currrentTextbookSource() == 1 &&
                    textbook.creator() == Login.user.id()
                  ) {
                    selfArr.push(textbook);
                  }
                  if (
                    self.currrentTextbookSource() == 2 &&
                    tb.orgId == Login.user.orgId() &&
                    textbook.creator() != Login.user.id()
                  ) {
                    schoolArr.push(textbook);
                  }
                  if (
                    self.currrentTextbookSource() == 3 &&
                    tb.orgId != Login.user.orgId() &&
                    textbook.creator() != Login.user.id()
                  ) {
                    outerArr.push(textbook);
                  }
                  if (
                    self.currrentTextbookSource() == 0 &&
                    textbook.creator() != Login.user.id()
                  ) {
                    allArr.push(textbook);
                  }
                }
                if (self.currrentTextbookSource() == 1) {
                  self.textbookList(selfArr);
                } else if (self.currrentTextbookSource() == 2) {
                  self.textbookList(schoolArr);
                } else if (self.currrentTextbookSource() == 3) {
                  self.textbookList(outerArr);
                } else {
                  self.textbookList(allArr);
                }
              }

              // self.textbookList.removeAll();
              // for (var i = 0; i < self.allTextbookList().length; i++) {
              //   self.textbookList.push(self.allTextbookList()[i]);
              // }
              callback && callback(result);
              self.isLoadingTextbookList(0);
            },
            function () {
              self.isLoadingTextbookList(-1);
              callbackError && callbackError();
            }
          );
          break;
        case 9:
          newTextbook.retrieveStudentTextbookList(
            self.course.id(),
            function (result) {
              self.myTextbookList.removeAll();
              for (var i = 0; i < result.length; i++) {
                var tb = result[i];

                var textbook = new Textbook(tb.courseId, tb.name, tb.type);
                textbook.needPlanCol = ko.observable(false);
                textbook.status = ko.observable(tb.status);
                textbook.hasLoaded = ko.observable(false);
                self.myTextbookList.push(textbook);
              }
              callback && callback();
            },
            function () {
              self.isLoadingTextbookList(-1);
              callbackError && callbackError();
            }
          );
          break;
        default:
      }
    };

    self.isICourse = function (textbook) {
      if (!textbook.id) {
        return false
      }
      if (textbook.type() == 10 || textbook.type() == 9 || textbook.type() == 11) {
        return true
      }
      return false
    }

    self.selectTextbook = function (textbook) {
      self.currentTextbook(textbook);

      if (self.viewMode() == "studentView" || self.isICourse(self.currentTextbook())) {
        if (self.isICourse(textbook)) {
          textbook.getICourseStuStat(function (data) {
            if (data.code == 1) {
              self.stuICourseStat(data.result)
            }
          })
        }
      }
      if (self.viewMode() == "viewTextbook" || self.isICourse(self.currentTextbook())) {
        // self.currentTextbook().retrieveDirectory(function() {
        //   self.currentTextbook().hasLoaded(true);
        // });
        self.isLoadingTextbook(1);
        self.currentTextbook().retrievePublishedDirectory(
          courseId,
          classId,
          function () {
            self.currentTextbook().hasLoaded(true);
            self.isLoadingTextbook(0);
          },
          function () {
            self.isLoadingTextbook(-1);
          }
        );
      } else if (self.viewMode() == "studentView") {
        // if (self.currentTextbook().type() == 1) {

        // } else {

        // }

        if (
          self.currentTextbook().type() == 4 ||
          self.currentTextbook().type() == 2
        ) {
          self.currentplatformType(1);
        }
        self.isLoadingTextbook(1);
        self.currentTextbook().retrieveLearningProgress(
          courseId,
          self.currentplatformType(),
          function (result) {
            self.currentTextbook().hasLoaded(true);
            self.isLoadingTextbook(0);
            self.currentTextbook().cover(result.textbook.cover);
            currentTextBook = result.textbook.courseId;
            if (self.isSingleTextbookMode()) {
              $(".page-title").text(result.textbook.courseName);
              self.currentTextbook().type(result.textbook.courseType);
            }

            for (
              var i = 0;
              i < self.currentTextbook().chapterList().length;
              i++
            ) {
              var chapter = self.currentTextbook().chapterList()[i];

              $(
                "#chapterTr" + chapter.id() + " .chapter-complete-circle"
              ).circleProgress({
                startAngle: -Math.PI / 2,
                value: chapter.progress / 100,
                size: 26,
                lineCap: "round",
                fill: "#ea5947",
              });

              for (var j = 0; j < chapter.sectionList().length; j++) {
                var section = chapter.sectionList()[j];

                $(
                  "#sectionTr" + section.id() + " .section-complete-circle"
                ).circleProgress({
                  startAngle: -Math.PI / 2,
                  value: section.progress / 100,
                  size: 26,
                  lineCap: "round",
                  fill: "#ea5947",
                });
              }
            }
          },
          function () {
            self.isLoadingTextbook(-1);
          }
        );
      }

      // textbook.getKnowledgeGraphDetail(function (result) {
      //   if (result.code == 1) {
      //     textbook.knowledgeGraphId(result.result.id)
      //     textbook.graphStartupStatus(result.result.startupStatus || 0)
      //     textbook.graphPublishStatus(result.result.publishStatus || 0)
      //   }
      // })
    };

    self.graphSwitchClick = function () {
      if (self.course.courseRole() != 1) {
        var dialog = new Dialog({
          title: self.course18nText.tips,
          body: self.course18nText.knowledgeNoAccessTips,
          hideCancelBtn: true,
          callbackConfirm: function () {
            dialog.hide()
          }
        })
        dialog.show()
      } else {
        if (self.currentTextbook().graphStartupStatus() == 0) {
          var dialog = new Dialog({
            title: self.course18nText.openKnowledgeGraph,
            body: self.course18nText.knowledgeOpenTips,
            callbackConfirm: function () {
              self.currentTextbook().modifyKnowledgeGraphStatus(1, function () {
                self.currentTextbook().graphStartupStatus(1)
                dialog.hide()
              })
            }
          })
          dialog.show()
        } else {
          self.currentTextbook().modifyKnowledgeGraphStatus(0, function () {
            self.currentTextbook().graphStartupStatus(0)
          })
        }
        
      }
    };

    self.toKnowledgeGraph = function () {
      window.open(UMOOC_WEB_HOST + '/pc.html#/knowledge/'+ self.currentTextbook().knowledgeGraphId() +'/preview?ocId=' + courseId)
    };

    (function init() {
      self.isLoadingViewMode(1);

      if (self.isSingleTextbookMode()) {
        self.viewMode("studentView");
        self.isLoadingViewMode(0);

        var textbook = new Textbook(textbookId);
        textbook.needPlanCol = ko.observable(false);
        textbook.status = ko.observable(1);
        textbook.hasLoaded = ko.observable(false);
        self.myTextbookList.push(textbook);
        self.selectTextbook(textbook);
      } else {
        self.searchTextbook(
          function (result) {
            self.getICourse(true, function () {
              switch (self.user.roleId()) {
                case 8:
                  for (var i = 0; i < self.allTextbookList().length; i++) {
                    var textbook = self.allTextbookList()[i];
                    if (textbook.selected()) {
                      self.myTextbookList.push(textbook);
                      self.selectedTextbookList.push(textbook);
                    }
                  }

                  // 判断有无课件
                  self.viewMode("viewTextbook");
                  // if (self.myTextbookList().length > 0) {
                  //   self.viewMode('viewTextbook')
                  // } else {
                  //   self.viewMode('chooseTextbook')
                  //   if (self.course.publishStatus() == 3) {
                  //     self.viewMode('viewTextbook')
                  //   }
                  //   if (self.course.courseRole() != 1) {
                  //     self.viewMode('viewTextbook')
                  //   }
                  // }
                  break;
                case 9:
                  self.viewMode("studentView");
                  break;
                default:
              }

              if (self.myTextbookList().length > 0 || true) {
                var newClass = new Class();
                newClass.ocId(courseId);
                newClass.retrievePureClassList(0, "", function (result) {
                  classId = result[0].classId;
                  if (textbookId2) {
                    var hasFound = false;
                    for (var i = 0; i < self.myTextbookList().length; i++) {
                      var tb = self.myTextbookList()[i];

                      if (tb.id() == textbookId2) {
                        hasFound = true;
                        self.selectTextbook(tb);
                      }
                    }

                    if (!hasFound && self.myTextbookList().length > 0) {
                      self.selectTextbook(self.myTextbookList()[0]);
                    }
                  } else {
                    if (self.myTextbookList().length > 0) {
                      self.selectTextbook(self.myTextbookList()[0]);
                    }
                  }

                  newClass.getStudentClass(function (result) {
                    if (result.classId) {
                      classId = result.classId;
                    }
                  });
                });
              }
              self.isLoadingViewMode(0);
            })

          },
          function () {
            self.isLoadingViewMode(-1);
          },
          true
        );
      }
    })();

    self.uaTextbook = ko.observable();
    self.textbookNameExist = ko.observable(false);
    self.createUaTextbook = function () {
      // self.uaTextbook(new Textbook('', self.course.name()));
      // $("#createTextbookModal").modal("show");
      window.open(UA_WEB_HOST + "/createCourse/#/main/courseList/editing");
    };

    $(document).on("input", "#uaTbInput", function () {
      self.textbookNameExist(false);
    });
    self.submitUaTextbook = function () {
      self.uaTextbook().isNameExist(function (response) {
        self.textbookNameExist(response);
        if (response) {
          return;
        }

        var response = self.uaTextbook().create();
        if (response.status == 200) {
          var data = response.responseJSON;
          self.uaTextbook().id(data.courseid);
          self.uaTextbook().hasLoaded = ko.observable(false);
          self.myTextbookList.push(self.uaTextbook());
          self.selectedTextbookList.push(self.uaTextbook());
          addTextbookCallback();
          $("#createTextbookModal").modal("hide");
          window.open(
            UA_WEB_HOST +
            "/createCourse/#/course/content/" +
            data.courseid +
            "?role=tea"
          );
        }
      });
    };

    self.getTextbookBySource = function (index) {
      self.currrentTextbookSource(index);
      self.searchTextbook();
    };

    self.deleteTextbook = function () {
      var bodyHtml =
        "<div>" +
        (self.course18nText.textbookTips14 || "确认删除该课件吗？") +
        "</div>";
      var dialog = new Dialog({
        title: self.course18nText.deleteCourseware || "删除课件",
        body: bodyHtml,
        callbackConfirm: function () {
          self.currentTextbook().delete(function () {
            self.myTextbookList.remove(self.currentTextbook());
            self.selectedTextbookList.remove(self.currentTextbook());
            addTextbookCallback();
            dialog.hide();
          });
        },
      });
      dialog.show();
    };
    self.editTb = function (textbook, e) {
      e.stopPropagation();
      window.open(
        UA_WEB_HOST + "/createCourse/#/course/content/" + textbook.id()
      );
    };
    self.prevTb = function (textbook, e) {
      e.stopPropagation();
      window.open(
        UA_WEB_HOST +
        "/learnCourse/learnCourse.html?isPreview=true&isAuthorPreview=true&courseId=" +
        textbook.id()
      );
    };

    self.isTextbookSelected = function (textbook) {
      for (var i = 0; i < self.selectedTextbookList().length; i++) {
        if (self.selectedTextbookList()[i].id() === textbook.id()) {
          return true;
        }
      }
      return false;
    };
    self.clickSelectedTextbook = function (textbook) {
      self.clickTextbook(textbook);
    };
    self.removingSelectedTb = ko.observable();
    self.removeSelectedTb = function (tb) {
      self.removingSelectedTb(tb);

      var bodyHtml =
        "<div>" +
        (self.course18nText.deleteTbConfirm ||
          "如果考核规则中设置了课件学习情况作为评分项，删除课件将会影响学生最终的汇总成绩，确定删除吗？") +
        "</div>";
      var dialog = new Dialog({
        title: self.course18nText.deleteCourseware || "删除课件",
        body: bodyHtml,
        callbackConfirm: function () {
          var bakTextbook = getItemById(tb.id(), self.selectedTextbookList());
          if (bakTextbook) {
            self.selectedTextbookList.remove(bakTextbook);
          }
          self.addTextbook(true);
          dialog.hide();
        },
      });
      dialog.show();
    };
    self.confirmRemoveTb = function () {
      var bakTextbook = getItemById(tb.id(), self.selectedTextbookList());
      if (bakTextbook) {
        self.selectedTextbookList.remove(bakTextbook);
      }
    };
    self.clickTextbook = function (textbook) {
      // textbook.selected(!textbook.selected());
      if (textbook.allowfreedomreg() != 1 && self.currrentTextbookSource() != 4) {
        return;
      }
      if (!self.isTextbookSelected(textbook)) {
        if (self.selectedTextbookList().length > 9) {
          var toast = new Toast();
          toast.show({
            type: "warning",
            message: self.course18nText.textbookTips15 || "只能添加10个课件",
          });
          textbook.selected(!textbook.selected());
          return;
        }
        self.selectedTextbookList.push(textbook);
      } else {
        // self.selectedTextbookList.remove(textbook);

        var bakTextbook = getItemById(
          textbook.id(),
          self.selectedTextbookList()
        );

        if (bakTextbook) {
          self.selectedTextbookList.remove(bakTextbook);
        }
      }
    };

    var isAddingTextbook = false;
    self.addTextbook = function (flag) {
      if (isAddingTextbook) {
        return;
      }
      // 判断所选课件是否有修改
      var needNotice = false;
      if (self.selectedTextbookList().length != self.myTextbookList().length) {
        needNotice = true;
      }
      for (var i = 0; i < self.selectedTextbookList().length; i++) {
        var st = self.selectedTextbookList()[i];

        var hasFound = false;
        for (var j = 0; j < self.myTextbookList().length; j++) {
          var mt = self.myTextbookList()[j];

          if (st.id() == mt.id()) {
            hasFound = true;
            break;
          }
        }
        if (!hasFound) {
          needNotice = true;
          break;
        }
      }
      if (self.perfectCourseMode() || flag) {
        addTextbookCallback();
      } else if (needNotice) {
        var bodyHtml =
          "<div>" +
          (self.course18nText.textbookTips16 ||
            "如果考核规则中设置了课件学习情况作为评分项，修改课件将会影响学生最终的汇总成绩，确认修改吗？") +
          "</div>";
        var dialog = new Dialog({
          title: self.course18nText.modifyCourseware || "修改课件",
          body: bodyHtml,
          callbackConfirm: function () {
            addTextbookCallback();

            dialog.hide();
          },
        });

        dialog.show();
        return;
      }
      self.viewMode("viewTextbook");

      // if (self.myTextbookList().length > 0) {
      //   self.selectTextbook(self.myTextbookList()[0])
      //   console.log(self.myTextbookList())
      // } else {
      //   console.log('last')
      //   self.currentTextbook({})
      // }
    };
    function sureActivateTextBook() {
      var inputs = $(".activation-code");
      var activationCode = "";
      for (var i = 0; i < inputs.length; i++) {
        activationCode += inputs.eq(i).val();
      }
      // console.log("激活课程:" + self.currentTextbook().name() + "，激活码：" + activationCode);
      if (activationCode.length == 0) {
        var toast = new Toast();
        toast.show({
          type: "warning",
          message: self.course18nText.textbookTips17 || "请输入激活码",
        });
        return;
      }
      self.currentTextbook().activateTextbook(
        activationCode, courseId, currentTextBook,
        function (result) {
          var toast = new Toast();
          if (result.code == 4) {
            //激活成功
            toast.show({
              type: "success",
              message: result.message,
              time: 2000,
            });
            setTimeout(function () {
              location.reload()
            }, 2000);
          } else {
            toast.show({
              type: "warning",
              message: result.message,
            });
          }
          setTimeout(function () {
            activateFlag = false;
          }, 1500);
        },
        function () {
          activateFlag = false;
        }
      );
    };
    function addTextbookCallback() {
      // 获取本次添加的课件
      var addTextbookList = [];
      var newTextbookList = [];
      for (var i = 0; i < self.selectedTextbookList().length; i++) {
        var tb = self.selectedTextbookList()[i];

        addTextbookList.push({
          courseId: tb.id(),
          name: tb.name(),
        });
        newTextbookList.push(tb);
      }

      isAddingTextbook = true;
      self.course.addTextbook(
        addTextbookList,
        function () {
          isAddingTextbook = false;
          if (self.perfectCourseMode()) {
            if (
              window.opener &&
              !window.opener.closed &&
              window.opener.refreshTextbookList
            ) {
              window.opener.refreshTextbookList();
            }
            window.close();
          }
          self.myTextbookList(newTextbookList);
          if (addTextbookList.length > 0) {
            self.viewMode("viewTextbook");
          }

          if (self.myTextbookList().length > 0) {
            self.selectTextbook(self.myTextbookList()[0]);
          } else {
            self.currentTextbook({});
          }
        },
        function () {
          isAddingTextbook = false;
        }
      );
    }
    self.changePlatformType = function () {
      self.currentplatformType($("#platformTypeSelect").val());
      self.selectTextbook(self.currentTextbook());
    };

    self.toggleSectionList = function (chapter) {
      if (chapter.sectionList().length == 0) {
        return;
      }
      $("#chapter" + chapter.id() + ", #chapterTr" + chapter.id()).toggleClass(
        "expand"
      );
      $("#chapter" + chapter.id() + ", #chapterTr" + chapter.id()).parent()
        .next(".section-rows")
        .fadeToggle();
    };
    self.toggleTextbookList = function (type) {
      $("." + type).toggleClass("expand");
      var expandBtn = $("." + type + "-expand-btn");
      if (
        expandBtn.text() == "展开" ||
        expandBtn.text() == self.course18nText.unfold
      ) {
        expandBtn.text(self.course18nText.fold || "收起");
      } else {
        expandBtn.text(self.course18nText.unfold || "展开");
      }
    };
    self.toSelectTb = function (i) {
      self.currrentTextbookSource(i);
      self.changeViewMode();
    };
    self.changeViewMode = function () {
      self.insideTextbookList.removeAll();
      self.outsideTextbookList.removeAll();
      if (self.currrentTextbookSource() == 4) {
        self.getICourse()
      } else {
        self.searchTextbook();
      }

      self.viewMode("chooseTextbook");
    };

    self.stuICourseStat = ko.observable({})
    self.iCourseParam = {
      keyword: '',
      type: ko.observable(0),
      ocId: courseId
    }
    self.getICourseByType = function (type) {
      self.iCourseParam.type(type)
      self.getICourse()
    }
    self.getICourse = function (isInit, callback) {
      if (self.user.roleId() == 9) {
        callback && callback()
        return
      }
      var newTextbook = new Textbook()
      newTextbook.retrieveICourseTextbookList(self.iCourseParam, function (result) {
        var arr = []
        for (var i = 0; i < result.length; i++) {
          var tb = result[i];
          var textbook = new Textbook(tb.textbookId, tb.name, tb.type)
          textbook.isICourse = true
          textbook.selected = ko.observable(tb.chosen == 1);
          textbook.creator = ko.observable(tb.creator);
          textbook.hasLoaded = ko.observable(false);
          arr.push(textbook);
          if (isInit && textbook.selected()) {
            self.myTextbookList.push(textbook);
            self.selectedTextbookList.push(textbook);
          }
        }
        self.textbookList(arr)
        callback && callback()
      })
    }



    self.previewICourse = function (tb, event) {
      event.stopPropagation()
      tb.retrieveICourseUrl(function (data) {
        if (data.code == 1) {
          window.open(data.result)
        }
      })
    }

    self.getTimeMinute = function (seconds) {
      if (!seconds) {
        return '--'
      }
      return (seconds / 60).toFixed(1)
    }

    self.statICourse = function () {
      window.open('#/iCourse/stat?ocId=' + courseId + '&textbookId=' + self.currentTextbook().id())
    }

    self.canSetTeachingPlan = function () {
      if (self.course.courseRole() != 1 && self.course.courseRole() != 2) {
        return false;
      }
      if (self.course.publishStatus() != 3) {
        if (self.currentTextbook().type() == 4) {
          return true;
        }
        if (self.currentTextbook().type() == 1) {
          for (
            var i = 0;
            i < self.currentTextbook().chapterList().length;
            i++
          ) {
            var chapter = self.currentTextbook().chapterList()[i];

            if (chapter.nodeType == 8) {
              return false;
            }
          }
          return true;
        }
      }

      return false;
    };
    self.viewTeachingPlan = function () {
      window.open(
        "#/textbook/teachingPlan?textbookId=" +
        self.currentTextbook().id() +
        "&courseId=" +
        self.course.id()
      );
    };
    self.viewTeachingResource = function () {
      // window.open(
      //   UMOOC_SERVER_HOST +
      //   "/umooc/tutorv2/teachingResource.do?operation=teachingResourceManage&ub2=1&ocId=" +
      //   self.course.id()
      // );
      window.open(
        UMOOC_WEB_HOST +
        "/pc.html#/teaCourseFile?ocId=" +
        self.course.id() + "&textbookId=" + self.currentTextbook().id()
      );
    };
    self.viewLearningProgress = function () {
      window.open(
        "#/textbook/learningProgress?textbookId=" +
        self.currentTextbook().id() +
        "&textbookType=" +
        self.currentTextbook().type() +
        "&courseId=" +
        self.course.id()
      );
    };
    self.previewChapter = function (chapter) {
      if (
        self.currentTextbook().type() == 1 ||
        self.currentTextbook().type() == 8
      ) {
        if (chapter.nodeType == 8) {
          window.open(
            UMOOC_SERVER_HOST +
            "/umooc/tutorv2/paper.do?operation=viewPaper&paperID=" +
            chapter.paperId
          );
        } else {
          window.open(
            UMOOC_SERVER_HOST +
            "/umooc/learner/study.do?operation=previewCourse&nodeID=" +
            chapter.chapterId +
            "&actID=" +
            self.currentTextbook().id()
          );
        }
      } else if (self.currentTextbook().type() == 4) {
        window.open(
          UA_WEB_HOST +
          "/learnCourse/learnCourse.html?courseId=" +
          self.currentTextbook().id() +
          "&chapterId=" +
          chapter.id() +
          "&isPreview=true"
        );
      } else if (self.currentTextbook().type() == 2) {
        window.open(
          UMOOC_SERVER_HOST +
          "/umooc/tutorv2/paper.do?operation=viewPaper&paperID=" +
          chapter.paperId
        );
      }
    };
    self.learnChapter = function (chapter) {
      if (
        chapter.isHided() ||
        self.currentTextbook().remaining < 0
      ) {
        return;
      }
      if (
        self.currentTextbook().type() == 1 ||
        self.currentTextbook().type() == 8
      ) {
        if (chapter.nodeType == 8) {
          window.open(
            UMOOC_SERVER_HOST +
            "/umooc/learner/study.do?operation=detectEnvironment&paperID=" +
            chapter.paperId +
            "&nodeID=" +
            chapter.id() +
            "&courseID=" +
            self.currentTextbook().id() +
            "&classID=" +
            classId +
            "&fw=examCourse"
          );
        } else {
          window.open(
            UMOOC_SERVER_HOST +
            "/umooc/learner/study.do?operation=startStudy&nodeID=" +
            chapter.id() +
            "&courseID=" +
            self.currentTextbook().id() +
            "&inUCC=" +
            (self.isSingleTextbookMode() ? 0 : 1) +
            "&ub2=1"
          );
        }
      } else if (self.currentTextbook().type() == 4) {
        window.open(
          UA_WEB_HOST +
          "/learnCourse/learnCourse.html?courseId=" +
          self.currentTextbook().id() +
          "&chapterId=" +
          chapter.id() +
          "&classId=" +
          classId +
          "&returnUrl=" +
          encodeURIComponent(location.href)
        );
      } else if (self.currentTextbook().type() == 2) {
        window.open(
          UMOOC_SERVER_HOST +
          "/umooc/learner/study.do?operation=detectEnvironment&paperID=" +
          chapter.paperId +
          "&nodeID=" +
          chapter.id() +
          "&courseID=" +
          self.currentTextbook().id() +
          "&classID=" +
          classId +
          "&fw=examCourse"
        );
      }
    };
    self.viewAnswer = function (chapter) {
      window.open(
        UMOOC_SERVER_HOST +
        "/umooc/learner/study.do?operation=courseStudyReport&paperID=" +
        chapter.paperId +
        "&courseExerciseID=" +
        chapter.id() +
        "&courseID=" +
        self.currentTextbook().id()
      );
    };
    self.buyTextbook = function () {
      window.open(
        UMOOC_SERVER_HOST +
        "/ulearning_web/web!courseDetail.do?courseID=" +
        self.currentTextbook().id()
      );
    };
    var activateFlag = false;
    self.verifyActivateCode = function () {
      var inputs = $(".activation-code");
      var activationCode = "";
      for (var i = 0; i < inputs.length; i++) {
        activationCode += inputs.eq(i).val();
      }
      // console.log("激活课程:" + self.currentTextbook().name() + "，激活码：" + activationCode);
      if (activationCode.length == 0) {
        var toast = new Toast();
        toast.show({
          type: "warning",
          message: self.course18nText.textbookTips17 || "请输入激活码",
        });
        return;
      }
      if (activateFlag) {
        return;
      }
      // if (courseId.length == 0 || textbookId2.length == 0) {
      //   var toast = new Toast();
      //   toast.show({
      //     type: "warning",
      //     message: "激活码与当前课件不符",
      //   });
      //   return;
      // }
      activateFlag = true;
      self.currentTextbook().verifyActivateCode(
        activationCode, courseId, currentTextBook,
        function (result) {
          var toast = new Toast();
          if (result.code == 4) {
            //激活成功
            // toast.show({
            //   type: "success",
            //   message: result.msg,
            // });
            // history.go(0);
            var mapHtml = '<div class="bubble_title">' + $.map(result.result, function (it, index) {
              return '<span class="titleTip">' + (self.course18nText.textbookNumber || '教材序号') + it.code + '</span><br><span class="titleTip">' + (self.course18nText.textbookName || '教材名称') + it.name + '</span>'
            }).join('<br>') + '</div>';
            var bodyHtml = '<div class="bubble">' + mapHtml + '<div class="bubble_tip">' + (self.course18nText.sureActivateAccount) + '</div></div>';
            var dialog = new Dialog({
              title: self.course18nText.activateTextbook || "激活教材",
              body: bodyHtml,
              confirmText: self.course18nText.queryActivate || "确定激活",
              callbackConfirm: function () {
                sureActivateTextBook();
                dialog.hide();
              },
              callbackCancel: function () {
                dialog.hide()
              },
            });
            dialog.show();
          } else if (result.code == 1) {
            //已被使用
            // toast.show({
            //   type: "warning",
            //   message: result.msg,
            // });
            var bodyHtml = '<div class="bubble">\
            <div class="bubble_top"><i class="iconfont icon-chucuo "></i><span class="message">' + result.message + '</span></div>\
            <div class="bubble_title"><span class="titleTip">'+ (self.course18nText.activateAccount || '激活账号') + '</span><span class="activeName">' + result.result + '</span></div>\
            <div class="bubble_foot">'+ (self.course18nText.activateErrorTip) + '</div>\
            </div>';
            var dialog = new Dialog({
              body: bodyHtml,
              title: course18nText.bindTitle || '提示',
              confirmText: course18nText.iKnowThat || "我知道了",
              hideCancelBtn: true,
              callbackConfirm: function () {
                dialog.hide();
              },
            });
            dialog.show();
          } else if (result.code == 2) {
            //激活码无效
            // toast.show({
            //   type: "warning",
            //   message: result.msg,
            // });
            var bodyHtml = '<div class="bubble">\
            <div class="bubble_top"><i class="iconfont icon-chucuo "></i><span class="message">' + result.message + '</span></div>\
            </div>';
            var dialog = new Dialog({
              body: bodyHtml,
              title: course18nText.bindTitle || '提示',
              confirmText: course18nText.iKnowThat || "我知道了",
              hideCancelBtn: true,
              callbackConfirm: function () {
                dialog.hide();
              },
            });
            dialog.show();
          } else if (result.code == 3) {
            //激活码与当前课件不符
            // toast.show({
            //   type: "warning",
            //   message: result.msg,
            // });
            var bodyHtml = '<div class="bubble">\
            <div class="bubble_top"><i class="iconfont icon-chucuo "></i><span class="message">' + result.message + '</span></div>\
            </div>';
            var dialog = new Dialog({
              body: bodyHtml,
              title: course18nText.bindTitle || '提示',
              confirmText: course18nText.iKnowThat || "我知道了",
              hideCancelBtn: true,
              callbackConfirm: function () {
                dialog.hide();
              },
            });
            dialog.show();
          } else {
            toast.show({
              type: "warning",
              message: result.message,
            });
          }
          setTimeout(function () {
            activateFlag = false;
          }, 1500);
        },
        function () {
          activateFlag = false;
        }
      );
    };

    self.closePage = function () {
      window.close();
    };

    self.getDate = function (date) {
      if (date) {
        date = new Date(date);
        return window.formatTime("{YYYY}-{MM}-{DD}")(date);
      } else {
        return "--";
      }
    };
    self.formatSeconds = function (seconds) {
      return window.formatSeconds(seconds);
    };

    if (!getCookie("scromTip_index")) {
      self.showScromTip(true);
    } else {
      self.showScromTip(false);
    }
    self.hideScromTip = function () {
      self.showScromTip(false);
      setCookie("scromTip_index", true, 99 * 365);
    };

    function getItemById(id, array) {
      for (var i = 0; i < array.length; i++) {
        var item = array[i];

        if (item.id() == id) {
          return item;
        }
      }

      return null;
    }

    $(".course-textbook-page").on("input", ".activation-code", function (e) {
      var value = $(this).val();
      var index = $(this)
        .attr("id")
        .substr($(this).attr("id").length - 1, 1);
      if (value.length > 4) {
        value = value.substring(0, 4);
        $(this).val(value);
        if (index < 4) {
          $(".activation-code").eq(index).focus();
        }
      } else if (value.length == 4) {
        if (index < 4) {
          $(".activation-code").eq(index).focus();
        }
      }
    });

    // 监听搜索框回车事件
    $(".course-textbook-page").on(
      "keydown",
      ".search-area .input-text",
      function () {
        if (event.keyCode && event.keyCode == 13) {
          $(this).siblings().click();
        }
      }
    );
  }

  return courseTextbookController;
});
