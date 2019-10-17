let app = getApp();
Page({

    /**
     * 页面的初始数据
     */
    data: {
        showDiaryInfoLoading: true, // 显示打卡日记加载中动画
        pageNum: 0, // 当前页面栈中的页面数量
        statusBarHeight: 0, // 状态栏高度
        titleBarHeight: 0,  // 标题栏高度

        diaryId: 0, // 打卡日记id编号
        diaryInfo: {
        },
        userInfo: '', // 当前小程序使用者信息
        // 日记存在两张以上图片时每张图片显示的长、宽度
        diaryImgWidth: Math.floor((app.globalData.windowWidth-(10+5+5+5+10))/3),
        hiddenMoreDiaryOperateBtn: true, // 控制对日记更多操作按钮显示、隐藏

        childCommentWidth: app.globalData.windowWidth - (10 + 35 + 8 + 10), // 二级评论显示视图的宽度

        placeholder: '写评论', // 评论框 评论为空时占位符
        hiddenCommentBox: true, // 控制评论框的显示、关闭
        pid: 0, // 当前评论所属的父级评论的id
        respondentId: 0, // 被评论用户的id编号
        commentText: '', // 评论内容
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function (options) {
        console.log(options);
        let that = this;
        that.data.diaryId = options.diaryId;
        that.data.userInfo = app.globalData.userInfo;
        that.setData({
            userInfo: that.data.userInfo
        });

        /**
         *  获取页面栈相关信息 需要根据页面栈数量来自定义页面导航栏
         *
         *  1.若是只有一个页面说明是由转发的打卡日记进入到该日记的详情页的
         *  则需要设置一个返回首页的按钮
         *
         *  2.若是存在多个页面 则设置一个返回上一级页面的按钮
         */
        let currPages = getCurrentPages();
        that.data.pagesNum = currPages.length;
        console.log('pagesNum:' + currPages.length);

        // 获取机器相关数据 获取状态&标题栏高度
        wx.getSystemInfo({
            success: function (res) {
                /*
                 * 1.状态栏与标题栏的总高度可以通过screenHeight - windowHeight 获取
                 * 'iPhone': 64, 'iPhone X': 88, 'android': 68 这是网上的一个标准
                 *
                 * 2.获取状态栏高度，再用总高度减去状态栏高度即得到标题栏高度了
                  */
                console.log(res.screenHeight);
                console.log(res.windowHeight);
                let totalTopHeight = 68;
                if (res.model.indexOf('iPhone X') !== -1) {
                    totalTopHeight = 88;
                } else if (res.model.indexOf('iPhone') !== -1) {
                    totalTopHeight = 64;
                }
                that.data.statusBarHeight = res.statusBarHeight;
                that.data.titleBarHeight = totalTopHeight - res.statusBarHeight;

                that.setData({
                    statusBarHeight: that.data.statusBarHeight,
                    titleBarHeight: that.data.titleBarHeight,
                    pageNum: that.data.pagesNum
                })

            },
        });

        // 根据打卡日记编号获取打卡日记详细信息
        that.getDiaryDetailInfo(that.data.diaryId);
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function () {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function () {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function () {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function () {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function () {
        let that = this;
        that.setData({
            showDiaryInfoLoading: true,
        });
        wx.showLoading({
            title: '数据加载中...'
        });
        that.getDiaryDetailInfo(that.data.diaryId);
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function () {

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

    /*
     * 通知上一个页面发生了点赞、评论数据变化 即设置变量diaryLikeAndCommentStatus=true告知上一个页面需要重新获取
     */
    noticePrePagesLikeAndCommentDataUpdate: function() {
        let that = this;
        let currPages = getCurrentPages();
        let pagesNum = that.data.pagesNum;
        let prePage = currPages[pagesNum - 2];
        prePage.setData({
            diaryLikeAndCommentStatus: true, // 需要更新
        });
    },


    // 返回上一级页面
    goBackPrePage: function () {
        wx.navigateBack({
            delta: 1
        })
    },

    // 跳转至首页
    goBackIndexPage: function () {
        wx.switchTab({
            url: '/pages/index/index'
        });
    },

    getDiaryDetailInfo: function (diaryId) {
        let that = this;
        wx.request({
            url: app.globalData.gateway
              + 'life-punch/api/punchCardDiary/getDiaryDetailInfoById',
            method: 'get',
            data: {
                diaryId: diaryId,
                visitorId: app.globalData.userInfo.id // 当前访问者用户id
            },
            header: {
                token: app.globalData.token
            },
            success: function (res) {
                console.log(res);
                let respData = res.data;
                console.log(respData);
                wx.hideLoading();
                wx.stopPullDownRefresh();
                switch (res.statusCode) {
                    case 200:
                        that.setData({
                            diaryInfo: respData.data,
                            showDiaryInfoLoading: false,
                        });
                        break;
                    case 400:
                        // 日记不存在
                        wx.showToast({
                            title: respData.msg,
                            icon: 'none',
                            duration: 1000,
                        });
                        setTimeout(function () {
                            if (that.data.pagesNum > 1)
                                that.goBackPrePage();
                            else
                                that.goBackIndexPage();

                        },1000);
                        break;
                    default:
                        wx.showToast({
                            title: respData.msg,
                            icon: 'none'
                        });
                        break;
                }
            },
            fail: function () {
                wx.hideLoading();
                wx.showToast({
                    title: '网络异常',
                    icon: 'none'
                });
            }
        })
    },

    // 进入指定用户的个人主页
    _intoPersonalHomePage: function(e) {
        console.log(e);
        // 传递被访问者的用户id, 在个人主页根据此id查询被访问者的个人信息
        let visitedUserId = parseInt(e.currentTarget.dataset.userId);

        wx.navigateTo({
            url: '../mine/personalHomePage/index'
                + '?visitedUserId=' + visitedUserId
        });
    },

    // 阻止模态框之外的页面点击事件
    _preventTab: function () {},

    // 弹出框蒙层截断touchmove事件
    _preventTouchMove: function() {},


    // 弹出模态对话框，显示更多的日记操作按钮 删除、投诉
    _showDiaryOperateBtn: function(e) {
        console.log(e);
        let that = this;
        let publisherId = e.currentTarget.dataset.publisherId;

        that.setData({
            hiddenMoreDiaryOperateBtn: false, // 显示更多操作按钮

            // 当前用户为日记发表者 显示删除日记按钮
            hiddenDeleteDiaryBtn: !(parseInt(that.data.userInfo.id) === parseInt(publisherId)),

            // 显示投诉日记按钮 显示条件 当前用户不为日记发表者
            hiddenComplainDiaryBtn: !(parseInt(that.data.userInfo.id) !== parseInt(publisherId)),
        });
        console.log('currUserId:' + parseInt(that.data.userInfo.id));
        console.log('publisherId:' + parseInt(publisherId));
    },

    // 隐藏模态对话框
    _closeDiaryOperateBtn: function() {
        let that = this;
        that.setData({
            hiddenMoreDiaryOperateBtn: true
        });
    },

    // 删除打卡日记
    _deleteDiary: function(e) {
        console.log(e);
        let that = this;
        wx.showModal({
            title: '温馨提示',
            content: '打卡日记删除后不可恢复,请谨慎删除!',
            confirmText: '确认删除',
            confirmColor: '#E53935',
            success: function (res) {
                // 关闭更多按钮模态框
                that._closeDiaryOperateBtn();

                // 确认删除
                if (res.confirm) {
                    wx.request({
                        url: app.globalData.gateway
                          + 'life-punch/api/punchCardDiary/deleteDiaryById',
                        method: 'delete',
                        data: {
                            projectId: that.data.diaryInfo.projectInfo.id,
                            diaryId: that.data.diaryInfo.id,
                            userId: parseInt(that.data.diaryInfo.publisher.id)
                        },
                        header: {
                            token: app.globalData.token
                        },
                        success: function (res) {
                            console.log(res);
                            let data = res.data;
                            switch (res.statusCode) {
                                case 200:
                                    if (that.data.pagesNum > 1)
                                        that.goBackPrePage();
                                    else
                                        that.goBackIndexPage();
                                    break;
                                default:
                                    wx.showToast({
                                        title: data.msg,
                                        icon: 'none',
                                        duration: 2000
                                    });
                                    break;
                            }
                        },
                        fail: function () {
                            wx.showToast({
                                title: '网络异常!'
                            });
                        }
                    });
                }
            }
        });
    },

    // 投诉打卡日记
    _complainDiary: function(e) {
        wx.showToast({
            title: 'TODO'
        })
    },

    // 预览日记图片
    _previewDiaryImage: function(e){
        let that = this,
            diaryResourceList = that.data.diaryInfo.diaryResource,
            length = diaryResourceList.length,
            ImgResourceList = [],
            index = 0;

        for (let i = 0; i < length; i++)
        {
            if (parseInt(diaryResourceList[i].type) === 1)
            // 加上图片访问的baseUrl  注意一定要改为http 不然预览网络图片一直黑屏
                ImgResourceList[index++] = diaryResourceList[i].resourceUrl;
        }

        wx.previewImage({
            // 当前显示图片的http链接
            current: e.currentTarget.dataset.imgUrl,

            // 需要预览的图片http链接列表
            urls: ImgResourceList,
            fail: function (res) {
                console.log(res);
            }
        })
    },

    // 点击打卡地址进入地图
    _intoPunchCardAddress: function() {
        let that = this;
        wx.openLocation({
            longitude: parseFloat(that.data.diaryInfo.address_longitude),
            latitude: parseFloat(that.data.diaryInfo.address_latitude)
        })
    },

    // 进入打卡圈子的打卡详情页
    _intoProjectDetailPage: function () {
        let that = this;
        wx.navigateTo({
            url: '/pages/punchCardDetailPage/index'
                + "?projectId=" + that.data.diaryInfo.projectInfo.id
                + "&isCreator=" + -1
        });
    },

    // 处理用户的点赞、取消点赞点击事件
    dealUserLike: function(e) {
        console.log(e);
        let diaryId = e.currentTarget.dataset.diaryId,
            haveLike = e.currentTarget.dataset.haveLike,
            that = this;

        let allLikeInfo = that.data.diaryInfo.allLikeInfo,
            likeRecordId = 0;

        // 已经点赞 则需要取消点赞
        if (haveLike === true)
        {
            // 获取该用户的点赞记录id
            let i = 0;
            for (i; i < allLikeInfo.length; i++) {
                let admirer = allLikeInfo[i].admirer;
                if (parseInt(that.data.userInfo.id) === parseInt(admirer.id)) {
                    likeRecordId = allLikeInfo[i].id;
                    break;
                }
            }
            wx.request({
              url: app.globalData.gateway + 'life-punch/api/diaryLike/cancelLike',
                method: 'delete',
                data: {
                    likeRecordId: likeRecordId,
                    diaryId: diaryId,
                },
                header: {
                    token: app.globalData.token
                },
                success: function (res) {
                    console.log(res);
                    let data = res.data;
                    switch (res.statusCode) {
                        case 200:
                            // 取消成功后则对页面的本地点赞数据的更新
                            // 设置当前用户对当前这条日记未点赞 点赞总人数-1
                            that.data.diaryInfo.haveLike = false;
                        that.data.diaryInfo.likeUserNum = that.data.diaryInfo.likeUserNum - 1;

                            // 清除当前日记的该用户的点赞信息
                            allLikeInfo.splice(i,1);
                            that.data.diaryInfo.allLikeInfo = allLikeInfo;
                            that.setData({
                                diaryInfo: that.data.diaryInfo
                            });

                            // 设置监测日记点赞、评论数据发生变化的变量 返回上一个页面时进行数据重新获取
                            that.noticePrePagesLikeAndCommentDataUpdate();

                            break;
                        default:
                            wx.showToast({
                                title: data.msg,
                                icon: 'none',
                                duration: 2000
                            });
                            break;
                    }
                },
                fail: function () {
                    wx.showToast({
                        title: '网络异常',
                        icon: 'none',
                        duration: 2000
                    });
                }
            });

        } else {
            // 进行点赞
            wx.request({
              url: app.globalData.gateway + 'life-punch/api/diaryLike/like',
                method: 'post',
                data: {
                  diaryId: diaryId,
                  likedUserId: that.data.diaryInfo.publisher.id, // 被点赞者
                  admirerId: that.data.userInfo.id
                },
                header: {
                    token: app.globalData.token
                },
                success: function (res) {
                    console.log(res);
                    let data = res.data;
                    switch (res.statusCode) {
                        case 200:
                            // 点赞成功后则对页面进行本地点赞数据的更新
                            // 设置当前用户对当前这条日记已点赞 点赞总人数+1
                            that.data.diaryInfo.haveLike = true;
                            that.data.diaryInfo.like_user_num = that.data.diaryInfo.like_user_num + 1;


                            // 将该条点赞记录添加至最点赞记录首部
                            let newLikeInfo =
                                [{
                                    id: data.data.like_record_id,
                                    admirer:{
                                        id: that.data.userInfo.id,
                                        avatarUrl: that.data.userInfo.avatarUrl
                                    }
                                }];
                            that.data.diaryInfo.allLikeInfo = newLikeInfo.concat(allLikeInfo);

                            that.setData({
                                diaryInfo: that.data.diaryInfo
                            });

                            // 设置监测日记点赞、评论数据发生变化的变量 返回上一个页面时进行数据重新获取
                            that.noticePrePagesLikeAndCommentDataUpdate();

                            break;
                        default:
                            wx.showToast({
                                title: data.errMsg,
                                icon: 'none',
                                duration: 2000
                            });
                            break;
                    }
                },
                fail: function () {
                    wx.showToast({
                        title: '网络异常',
                        icon: 'none',
                        duration: 2000
                    });
                }

            })
        }
    },

    // 点击评论按钮显示评论框
    showCommentBox: function(e) {
        console.log(e);
        let that = this;
        that.data.diaryId = parseInt(e.currentTarget.dataset.diaryId);
        that.data.pid = parseInt(e.currentTarget.dataset.pid);
        that.data.respondentId = parseInt(e.currentTarget.dataset.respondentId);

        that.setData({
            hiddenCommentBox: false,
            commentText: '',
        });
    },

    // 监听评论内容的输入
    editComment: function (e) {
        let that = this;
        that.data.commentText = e.detail.value;

        that.setData({
            commentText: that.data.commentText
        });
    },

    // 关闭评论框
    closeCommentBox: function() {
        let that = this;
        that.setData({
            hiddenCommentBox: true,
        });
    },

    // 点击评论发送按钮，发表对日记的一级评论 即对日记发表者进行评论，数据发送至服务器
    publishComment: function () {
        let  that = this;

        if (that.data.commentText <= 0) {
            wx.showToast({
                title: '评论内容不能为空!',
                icon: 'none',
                duration: 2000
            });
            return false;
        }
        wx.request({
          url: app.globalData.gateway + 'life-punch/api/diaryComment',
            method: 'post',
            data: {
              diaryId: that.data.diaryId,
              pid: that.data.pid,
              reviewerId: app.globalData.userInfo.id, // 评论者id
              textComment: that.data.commentText,
              respondentId: that.data.respondentId // 被评论者id
            },
            header: {
                token: app.globalData.token
            },
            success: function (res) {
                console.log(res);
                let respData = res.data;
                // 关闭评论框
                that.closeCommentBox();

                switch (res.statusCode) {
                    case 200:
                        // 设置评论数+1
                        let diaryInfo = that.data.diaryInfo;
                    diaryInfo.commentNum = parseInt(diaryInfo.commentNum) + 1;

                        // 将新评论添加至本地数据中
                        let newCommentInfo = [respData.data];
                        let oldCommentInfo = that.data.diaryInfo.allCommentInfo;
                        that.data.diaryInfo.allCommentInfo = oldCommentInfo.concat(newCommentInfo);

                        that.setData({
                            diaryInfo: that.data.diaryInfo
                        });
                        wx.showToast({
                            title: '评论成功'
                        });

                        // 设置监测日记点赞、评论数据发生变化的变量 返回上一个页面时进行数据重新获取
                        that.noticePrePagesLikeAndCommentDataUpdate();

                        break;
                    default:
                        wx.showToast({
                            title: respData.msg,
                            icon: 'none',
                            duration: 2000
                        });
                        break;
                }
            },
            fail: function () {
                wx.showToast({
                    title: '网络异常',
                    icon: 'none',
                    duration: 2000
                });
            }
        })
    },

    // 点击某条评论信息进行回复 若是点击了自己发表的评论信息则显示删除按钮
    deleteComment: function(e) {
        let that = this;
        let commentId = parseInt(e.currentTarget.dataset.commentId),  // 所点击的评论的记录id
            diaryId = e.currentTarget.dataset.diaryId;      // 评论记录所属日记的记录id
        wx.showModal({
            title: '',
            content: '确定删除评论?',
            success: function (res) {
                // 确认删除
                if (res.confirm)
                {
                    wx.request({
                        url: app.globalData.gateway
                          + 'life-punch/api/diaryComment/' + commentId,
                        method: 'delete',
                        data: {
                            diaryId: diaryId,
                            //commentId: commentId
                        },
                        header:{
                          token: app.globalData.token
                        },
                        success: function (res) {
                            console.log(res);
                            let respData = res.data;
                            switch (res.statusCode) {
                                case 200:
                                    let deletedNum = 1;
                                    let allCommentInfo = that.data.diaryInfo.allCommentInfo;
                                    let newCommentInfo;
                                    newCommentInfo = [];
                                    for (let i = 0; i < allCommentInfo.length; i++) {
                                        let itemCommentId = parseInt(allCommentInfo[i].id);
                                        let itemCommentPid = parseInt(allCommentInfo[i].pid);
                                        // 删除掉该评论（若是一级评论同时删除其二级评论）
                                        if (commentId !== itemCommentId && commentId !== itemCommentPid) {

                                            newCommentInfo[i] = allCommentInfo[i]
                                        }
                                    }

                                    // 设置评论数
                                    let diaryInfo = that.data.diaryInfo;
                                    diaryInfo.comment_num = parseInt(diaryInfo.comment_num) - deletedNum;
                                    diaryInfo.allCommentInfo = newCommentInfo;
                                    console.log(newCommentInfo);
                                    console.log(diaryInfo.allCommentInfo);

                                    that.setData({
                                        diaryInfo: that.data.diaryInfo
                                    });

                                    // 设置监测日记点赞、评论数据发生变化的变量 返回上一个页面时进行数据重新获取
                                    that.noticePrePagesLikeAndCommentDataUpdate();

                                    wx.showToast({
                                        title: '删除评论成功'
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
                        },
                        fail: function () {
                            wx.showToast({
                                title: '网络异常',
                                icon: 'none',
                                duration: 2000
                            });
                        }
                    });
                }
            }
        });
    },

    // 加入打卡圈子
    attendPunchCardProject: function() {
        let that = this;

        console.log(that.data.projectId);
        wx.request({
          url: app.globalData.gateway + 'life-punch/api/punchCardProject/joinProject',
            method: 'post',
            data: {
                userId: that.data.userInfo.id,
                projectId: that.data.diaryInfo.projectInfo.id
            },
            success: function (res) {
                console.log(res);
                let respData = res.data;
                switch (res.statusCode) {
                    case 200:
                        wx.showToast({
                            title: '加入成功!',
                            duration: 1000
                        });
                        that.data.diaryInfo.existAttendProject = true;
                        that.setData({
                            diaryInfo: that.data.diaryInfo
                        });
                        break;
                    default:
                        wx.showToast({
                            title: respData.msg,
                            icon: 'none',
                            duration: 2000
                        });
                        break
                }
            },
            fail: function () {
                wx.showToast({
                    title: '网络异常',
                    icon: 'none',
                    duration: 2000
                });
            }
        });
    },
});