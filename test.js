//头部搜索打开
$(".jpdz_header_101 .sousuo-btn").click(function () {
    $(this).fadeOut().siblings("form").fadeIn().parent().siblings(".navigation").fadeOut();
});

// 头部搜索关闭
$(".jpdz_header_101 .close-search").click(function () {
    $(this).siblings("input").val("").parent().fadeOut().siblings(".sousuo-btn").fadeIn().parent().siblings(".navigation").fadeIn();
});

// 标题浮动出现动画
var animationList = [];
$(".animation").each(function () {
    var obj = {
        dom: $(this),
        top: $(this).offset().top
    };
    animationList.push(obj);
});
var windowHeight = $(window).height();

$(window).scroll(function () {
    //固定头部
    $(document).scrollTop() > 300 ? $('.jpdz_header_101').addClass('fixed') : $('.jpdz_header_101').removeClass('fixed');

    // 标题浮动出现动画
    var scrollTop = $(window).scrollTop(); //滚动条的垂直位置
    for (var i = 0; i < animationList.length; i++) {
        var curAnimation = animationList[i];
        if ($(curAnimation.dom).hasClass("fade-in")) {
            continue;
        }
        if (scrollTop + windowHeight >= curAnimation.top) {
            $(curAnimation.dom).addClass("fade-in");
        }
    }
});