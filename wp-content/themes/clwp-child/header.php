<!doctype html>
<html class="no-js" <?php language_attributes(); ?> >

<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="shortcut icon" href="<?= get_site_url() . '/wp-content/themes/clwp-child/assets/images/favicon.ico'; ?>" type="image/x-icon">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
    <?php 
        do_action( 'clwp_after_body' ); 
        do_action( 'clwp_layout_start' );
    ?>

    <div class="max-container">
        <?php 
            get_template_part('template-parts/part', 'header-menu-top');
            get_template_part('template-parts/part', 'header-menu');
            do_action( 'clwp_after_header' );
        ?>