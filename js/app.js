window._ = require('lodash');
window.$ = window.jQuery = require('jquery');

function updateNav() {
    let scrollTop = $(window).scrollTop();
    if (scrollTop > 80) {
        $('#floating-top-nav').css('display', 'block')
    } else {
        $('#floating-top-nav').css('display', 'none');
    }
}

$(document).ready(function () {
    updateNav();
    $(window).on('scroll', updateNav);
})