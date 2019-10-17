let app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        userInfo: {},
         systemInfo: {},//用户提交小程序用户信息
      canIUse: wx.canIUse('button.open-type.getUserInfo'),
        // 打卡日记列表信息显示
        punchCardDiaryList: [
           
        ], // 从服务器获取的打卡日记数据集合
        diaryListPageNo: 1, // 当前已加载的页码
        diaryListDataNum: 2, // 每页显示的打卡日记条数
        showDiaryListLoading: true, // 控制页面初次加载时日记列表数据获取的加载动画
        emptyDiaryListNotice: false, // 控制还没有日记列表数据时的提示信息
        moreDiaryDataLoad: false, // 控制上拉加载更多打卡日记的加载动画
        notMoreDiaryData: false, // 打卡日记已全部加载

        // 记录当前播放音频的打卡日记的下标 -1代表所有的打卡日记都没有播放音频
        currPlayAudioDiaryItemIndex: -1,
        hasPromise: true
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function () {
        let that = this;

        // 关闭本页面右上角的转发按钮 想要转发只能通过button实现
        wx.hideShareMenu();

        that.setData({
            userInfo: app.globalData.userInfo,
            hasPromise: app.globalData.hasPromise
        });
        
        // 获取我的打卡日记列表（第一页数据）
        let startTime = Date.now();         // 记录请求开始时间
        that.getMyPunchCardDiaryList(1, that.data.diaryListDataNum, function (res) {
            console.log(res);
            let respData = res.data;
            let endTime = Date.now(); // 请求结束时间
            switch (res.statusCode) {
                case 200:
                    that.data.punchCardDiaryList = []; // 清空列表

                    // 防止请求过快，设置一个定时器来让加载动画的切换平滑一点
                    if (endTime - startTime <= 1000)
                    {
                        setTimeout(function () {
                            that.setData({
                                emptyDiaryListNotice: false,
                                showDiaryListLoading: false, // 关闭初次获取打卡日记时的加载动画
                                punchCardDiaryList: respData.data,
                                diaryListPageNo: 1 // 设置当前已加载的页码为1
                            });
                        },500);
                    } else  {
                        that.setData({
                            emptyDiaryListNotice: false,
                            showDiaryListLoading: false,
                            punchCardDiaryList: respData.data,
                            diaryListPageNo: 1

                        });
                    }
                    break;

                case 400:
                    // 我还没有打卡日记数据，显示打卡日记列表为空的提示信息
                    if (endTime - startTime <= 1000)
                    {
                        setTimeout(function () {
                            that.setData({
                                emptyDiaryListNotice: true,  // 显示打卡日记列表为空的提示信息
                                showDiaryListLoading: false, // 关闭初次获取打卡日记时的加载动画
                            });
                        },1000);

                    } else  {
                        that.setData({
                            emptyDiaryListNotice: true,
                            showDiaryListLoading: false,
                        });
                    }
                    break;

                default:
                    wx.showToast({
                        title: respData.msg,
                        icon: 'none',
                        duration: 2000
                    });
                    break;
            }
        });

    },

    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 页面下拉刷新事件的处理函数
     */
    onPullDownRefresh: function () {
        let that = this;
        that.getMyPunchCardDiaryList(1, that.data.diaryListDataNum, function (res) {

            wx.stopPullDownRefresh(); // 请求成功停止下拉刷新

            let respData = res.data;
            switch (res.statusCode) {
                case 200:
                    that.data.punchCardDiaryList = []; // 清空列表
                    that.setData({
                        emptyDiaryListNotice: false,
                        showDiaryListLoading: false,
                        punchCardDiaryList: respData.data,
                        diaryListPageNo: 1,
                        notMoreDiaryData: false // 下拉刷新后需要重置打卡日记列表为未完全加载完毕状态
                    });

                    wx.showToast({
                        title: '获取新数据成功',
                        duration: 2000
                    });

                    break;

                case 400:
                    // 我还没有打卡日记数据，显示打卡日记列表为空的提示信息
                    that.setData({
                        emptyDiaryListNotice: true,
                        showDiaryListLoading: false,
                        notMoreDiaryData: false
                    });
                    break;

                default:
                    wx.showToast({
                        title: respData.msg,
                        icon: 'none',
                        duration: 2000
                    });
                    break;
            }
        });
    },


    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {
        // 上拉加载下一页打卡日记数据
        let that = this,
            nextPageNo = that.data.diaryListPageNo + 1;

        // 打卡日记已经全部加载则不再发起请求
        if (that.data.notMoreDiaryData === true)
            return;

        that.setData({
            moreDiaryDataLoad: true, // 显示加载下一页打卡日记数据的动画
        });

        that.getMyPunchCardDiaryList(nextPageNo, that.data.diaryListDataNum, function (res) {
            let respData = res.data;
            switch (res.statusCode) {
                case 200:
                    let length = respData.data.length;
                    // 说明当前请求的页码没有数据，则上一页码已经是最后一页
                    if (length <= 0) {
                        that.setData({
                            notMoreDiaryData: true, // 设置打卡日记列表已经全部加载完毕
                            moreDiaryDataLoad: false, // 关闭加载动画
                            diaryListPageNo: nextPageNo - 1
                        });
                        console.log(that.data.diaryListPageNo);

                    } else {
                        // 将新数据追加入已获取的打卡日记列表集合中
                        for (let i = 0; i < length; i++) {
                            that.data.punchCardDiaryList[that.data.punchCardDiaryList.length] =
                                respData.data[i];
                        }

                        that.setData({
                            notMoreDiaryData: false, // 说明当前请求的页码还不是尾页，是否已完全加载完毕也未知
                            moreDiaryDataLoad: false, // 关闭加载动画
                            punchCardDiaryList: that.data.punchCardDiaryList,
                            diaryListPageNo: nextPageNo
                        });
                        console.log(that.data.diaryListPageNo);

                    }
                    break;

                default:
                    wx.showToast({
                        title: respData.errMsg,
                        icon: 'none',
                        duration: 2000
                    });
                    break;
            }
        })
    },

    // 点击日记的分享按钮 分享打卡日记
    onShareAppMessage: function(options) {
        console.log(options);

        // 获取当前被分享的打卡日记相关数据
        let currDiary = options.target.dataset.diary;

        // 当前用户id
        let currUserId = parseInt(app.globalData.userInfo.id);
        // 与该打卡日记的用户id对比 检测当前用户是否为该日记的发表者
        let isDiaryPublisher = (currUserId === parseInt(currDiary.publisher.id));

        // 设置分享的标题
        let shareTitle = '';
        if (isDiaryPublisher) {
            // 分享的是自己的打卡日记
          shareTitle = '【' + app.globalData.userInfo.nickName + '】的打卡日记';
        } else {
          shareTitle = currDiary.publisher.nickName + '的打卡日记';
        }

        // 设置分享的图片的url
        let imgUrl = '';
        if (currDiary.diaryResource.length <= 0 || parseInt(currDiary.diaryResource[0].type) === 2) {
            // 资源列表为空或者资源列表第一个元素存放的不是图片（type=1）都说明该日记不存在图片资源
            //  分享一张已设置的图片
            imgUrl = 'http://upload.dliony.com/2a083fec0fee4ba1b55adb0885b53237';
        } else {
            // 存在图片资源 设置第一张图片为分享图片
            imgUrl = currDiary.diaryResource[0].resourceUrl;
        }
        console.log(imgUrl);

        return {
            title: shareTitle,
            path: '/pages/diaryDetailPage/index' + '?diaryId=' + currDiary.id,
            imageUrl: imgUrl
        };
    },


    // 进入我的主页，展示更为详细的用户信息
    intoUserInfoDetailPage: function () {
        wx.navigateTo({
            url: './personalHomePage/index'
                + "?visitedUserId=" + app.globalData.userInfo.id
        })
    },


    /**
     * * 获取指定页码的打卡日记列表
     * @param pageNo 需要获取打卡日记列表的页码
     * @param dataNum 每页的打卡日记条数
     * @param callback 请求成功的回调处理函数
     */
    getMyPunchCardDiaryList: function(pageNo,dataNum,callback) {
      let that = this;
      var visitedUserId;
      if (app.globalData.userInfo.id == undefined){
            visitedUserId = 0;
        }else{
        visitedUserId = app.globalData.userInfo.id;
        }
        wx.request({
          url: app.globalData.gateway + 'life-punch/api/punchCardDiary/listUserPunchCardDiary',
            method: 'get',
            data: {
                visitedUserId: visitedUserId, // 被查看打卡日记列表的用户的id
                //visitorUserId: app.globalData.userInfo.id, // 查看者的id
                pageNo: parseInt(pageNo),
                dataNum: parseInt(dataNum),
                isDiaryCreator: 1, // 代表查询自己的打卡日记列表 0则代表查看他人的
            },
            header: {
                token: app.globalData.token
            },
            success: function (res) {
                // 请求成功执行回调函数进行对应的处理
                callback && callback(res);
            },
            fail: function () {
                wx.showToast({
                    title: '网络异常,无法获取打卡日记',
                    icon: 'none',
                    duration: 2000
                });
            }
        });
    },

    // 打卡日记为空时，可以点击跳转到打卡圈子列表所处的首页
    intoPunchCardListPage: function() {
        wx.switchTab({
            url: '/pages/index/index'
        })
    },

    intoDiaryDetailPage: function () {
        wx.showToast({
            title: '进入打卡日记详情页'

        })
    },

    todoNotice: function () {
      wx.showToast({
          icon: 'none',
          title: '功能开发中',
          duration: 1000
      })
    },

    // 当音频组件的播放状态发生改变时，会触发父组件该方法
    // 父组件会重新更新一个用来标识是哪个打卡日记中的音频文件被播放的变量的值
    parentPageGetAudioPlayStatus: function (e) {
        // console.log('父级页面接收到音频组件播放状态改变通知:');
        // console.log(e);
        let diaryItemIndex  = e.detail.diaryItemIndex,
            audioPlayStatus = e.detail.audioPlayStatus;
        console.log('音频播放状态发生改变，此时的状态是：' + audioPlayStatus);
        console.log('播放状态发生改变的音频所处的日记子项的index：' + diaryItemIndex);
        let that = this;

        if (audioPlayStatus === 'pause') {
            that.data.currPlayAudioDiaryItemIndex = -1;
        }

        if (audioPlayStatus === 'play') {
            that.data.currPlayAudioDiaryItemIndex = diaryItemIndex;
        }
        console.log('父页面参数currPlayAudioDiaryItemIndex = ' + that.data.currPlayAudioDiaryItemIndex);

        that.setData({
            currPlayAudioDiaryItemIndex: that.data.currPlayAudioDiaryItemIndex
        });
    },

  wxLogin: function(){
    let that = this;
    // 1.进行微信登录获取code、进而获取openId
    let weiXinLoginPromise = new Promise(function (resolve) {
      that.weiXinLogin();
      setInterval(function () {
        // 成功获取openId后执行下一步
        if (app.globalData.openId !== '') {
          resolve(true);
        }
      }, 500);
    });

    // 2.获取openId成功,进行用户授权判断
    weiXinLoginPromise.then(function (result) {
      wx.getSetting({
        success: function (res) {
          // 用户已经授权
          if (res.authSetting['scope.userInfo']) {
            // 进入个人信息页
              that.intoUserInfoDetailPage();
          } else {
            // 没有授权则进入授权页进行用户授权
            wx.redirectTo({
              url: '../loginAuth/index'
            })
          }
        }
      })

    });

    if (app.globalData.userInfo.id === undefined) {
      app.userInfoReadyCallBack = function (userInfo) {
        that.setData({
          userInfo: userInfo
        })
      };
    } else {
      that.setData({
        userInfo: app.globalData.userInfo
      });
    }



  },



  // 微信登录获取openId
  weiXinLogin: function () {
    // 微信登录，获取用户openID
    wx.login({
      success: function (res) {
        if (res.code) {
          wx.request({
            url: app.globalData.gateway +
              'life-user/api/user/getWxUserInfo',
            data: {
              code: res.code
            },
            header: {
              token: app.globalData.token
            },
            success: function (response) {
              switch (response.statusCode) {
                case 200:
                  app.globalData.openId = response.data.data.openId;
                  //app.globalData.openId = 'efsfesfesfsef';
                  app.globalData.token = response.data.data.token;
                  break;
                default:
                  wx.showToast({
                    title: response.data.msg,
                    icon: "none"
                  });
                  break;
              }
              console.log("openId:" + app.globalData.openid);
            },
            fail: function () {
              wx.showToast({
                title: '网络异常...',
                icon: "none"
              })
            }
          })
        } else {
          console.error('微信登录失败:' + res.msg);
        }
      }
    });
  },

  getSystemInfo: function () {
    let that = this;
    wx.getSystemInfo({
      success: res => {
        console.log("获取到的系统信息：" + res)
        that.data.systemInfo.brand = res.brand;
        that.data.systemInfo.model = res.model;
        that.data.systemInfo.wxLanguage = res.language;
        that.data.systemInfo.system = res.system;
        that.data.systemInfo.platform = res.platform;
      },
      fail: res => {
        console.log("获取系统信息失败")
      },
    });
  },

  // 服务器端根据openid判断用户信息是否存在，不存在将用户微信信息存入数据库
  addWeiXinUserInfo: function () {
    console.log(app.globalData.userInfo);
    let that = this;
    let avatarUrl = app.globalData.userInfo.avatarUrl;
    wx.request({
      url: app.globalData.gateway + 'life-user/api/user',
      data: that.data.systemInfo,
      method: "POST",
      header: {
        'content-type': 'application/json',
        'token': app.globalData.token
      },
      success: function (res) {
        switch (res.statusCode) {
          case 200:
            // 本地保存服务器端返回的用户信息
            app.globalData.userInfo = res.data.data;
            break;
          default:
            wx.showToast({
              title: res.data.msg,
              icon: 'none',
              duration: 2000
            });
            break;
        }
        console.log("服务器端处理用户授权信息并返回用户数据", res);

        // 由于request是异步网络请求，可能会在Page.onLoad执行结束才能返回数据
        // 这也就会导致在Page.onLoad获取不到request设置的全局变量
        // 因为Page.onLoad结束在request之前，这时候获取的变量是空值
        // 因此加入全局回调函数
        if (app.userInfoReadyCallBack !== '') {
          app.userInfoReadyCallBack(res.data.data);
        }

      },
      fail: function () {
        wx.showToast({
          title: '网络异常...',
          icon: "none"
        })
      }
    });
  },



});