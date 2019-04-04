<!doctype html>
<html class="no-js" <?php language_attributes(); ?> >

<head>
    <!-- Google Tag Manager -->
    <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-K467P42');</script>
    <!-- End Google Tag Manager -->

    <meta charset="<?php bloginfo( 'charset' ); ?>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="shortcut icon" href="<?= get_site_url() . '/wp-content/themes/clwp-child/assets/images/favicon.ico'; ?>" type="image/x-icon">
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
    <!-- Google Tag Manager (noscript) -->
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K467P42"
    height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
    <!-- End Google Tag Manager (noscript) -->

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