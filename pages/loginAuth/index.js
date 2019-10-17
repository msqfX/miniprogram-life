let app = getApp();
Page({
    data: {
        //判断小程序的API，回调，参数，组件等是否在当前版本可用。
        canIUse: wx.canIUse('button.open-type.getUserInfo'),
        systemInfo: {},//用户提交小程序用户信息
      userInfo:{}
    },
    onLoad: function() {
        
    },

    // 授权登录回调函数，返回值的detail.userInfo等同于wx.getUserInfo的用户信息
    bindGetUserInfo: function(e) {

      let that = this;
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
              success: function (response) {
                if (response.statusCode !== 200) {
                  wx.showToast({
                    title: response.data.msg,
                    icon: "none"
                  })
                } else {
                  app.globalData.openId = response.data.data.openId
                }
                console.log(response);
                console.log(app.globalData.openId);
              },

              fail: function () {
                wx.showToast({
                  title: '网络异常...',
                  icon: "none"
                })
              }
            })

          } else {
            console.error('微信登录失败:' + res.errMsg);
          }
        }
      });

      // 查看是否授权
      wx.getSetting({
        success: function (res) {
          // 用户已经授权
          if (res.authSetting['scope.userInfo']) {

            // 获取用户信息
            wx.getUserInfo({
              success: function (res) {
                console.log("获取用户信息：");
                console.log(res);
                console.log(app.globalData.openid);
                that.getSystemInfo();

                // 保存用户微信信息至全局变量,同时保证字段名与表字段名一致
                app.globalData.userInfo.avatarUrl = res.userInfo.avatarUrl;
                app.globalData.userInfo.nickName = res.userInfo.nickName;
                app.globalData.userInfo.sex = parseInt(res.userInfo.gender);

                // 为了防止在用户第一次授权的时候，服务器未能成功添加用户信息
                // 在授权成功依旧根据openId检测，再次添加，添加成功返回服务器
                // 数据库用户信息

                that.data.systemInfo.openId = app.globalData.openId;
                that.data.systemInfo.avatarUrl = res.userInfo.avatarUrl;
                that.data.systemInfo.nickName = res.userInfo.nickName;
                that.data.systemInfo.gender = parseInt(res.userInfo.gender);

                that.data.systemInfo.province = res.userInfo.province;
                that.data.systemInfo.city = res.userInfo.city;
                that.data.systemInfo.country = res.userInfo.country;
                that.data.systemInfo.language = res.userInfo.language;

                that.addWeiXinUserInfo();
                // 进入首页
                wx.switchTab({
                  url: '../index/index',
                  success: function (e) {
                    var page = getCurrentPages().pop();
                    if (page == undefined || page == null) return;
                    page.onLoad();
                  }
                })
              }
            });

          } // 没有授权则不进入首页，显示当前的授权页面,进行用户授权
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
    addWeiXinUserInfo: function() {
        console.log(app.globalData.userInfo);
        let that = this;
        let avatarUrl = app.globalData.userInfo.avatarUrl;
        wx.request({
            url: app.globalData.gateway + 'life-user/api/user',
            method: 'post',
            data: that.data.systemInfo,
            header: {
                'content-type': 'application/json',
                'token': app.globalData.token
            },
            success: function (res) {
                wx.hideLoading();
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

                console.log(res);
                console.log("服务器端处理用户授权信息并返回用户数据");

                // 由于request是异步网络请求，可能会在Page.onLoad执行结束才能返回数据
                // 这也就会导致在Page.onLoad获取不到request设置的全局变量
                // 因为Page.onLoad结束在request之前，这时候获取的变量是空值
                // 因此加入全局回调函数
                if (app.userInfoReadyCallBack !== '') {
                    app.userInfoReadyCallBack(res.data.userInfo);
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
    //暂不登录
  laterLogin: function(){
    wx.switchTab({
      url: '../index/index'
    })
  }

});