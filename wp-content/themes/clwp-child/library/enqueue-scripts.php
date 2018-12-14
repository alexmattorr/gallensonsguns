<?php 
function clwp_enqueue_styles() {
    wp_enqueue_style( 'main', get_stylesheet_directory_uri() . '/assets/stylesheets/main.css', array(), '1.0.0', 'all' );
    wp_enqueue_script( 'main', get_stylesheet_directory_uri() . '/assets/javascript/main.js', array('jquery'), '1.0.0', true );
    wp_deregister_style( 'js_composer_front' );
}
add_action( 'wp_enqueue_scripts', 'clwp_enqueue_styles' );