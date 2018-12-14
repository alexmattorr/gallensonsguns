(function($) {
  var sliders = {

    hero: function(slider) {
      slider.slick({
        infinite: true,
        autoplay: true,
        autoplaySpeed: 8000,
        arrows: true,
        dots: true,
        fade: false
      });
    },

    images: function(slider) {
      slider.slick({
        infinite: true,
        slidesToShow: 3,
        slidesToScroll: 3,
        arrows: false,
        dots: true,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3
            }
          },{
            breakpoint: 640,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
      });
    },

    products: function(slider) {
      slider.slick({
        infinite: true,
        slidesToShow: 4,
        slidesToScroll: 4,
        arrows: false,
        dots: true,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3
            }
          },{
            breakpoint: 640,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
      });
    },

    init: function() { 
      sliders.hero($('.hero.carousel'));
      sliders.images($('.images.carousel'));
      sliders.products($('.products.carousel'));
    }
  };

  $(document).ready(function() {
    sliders.init();
  });
})(jQuery);