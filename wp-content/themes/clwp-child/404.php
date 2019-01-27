<?php
/**
 * The template for displaying 404 pages (not found)
 */
get_header(); ?>

<section class="row error-container">
    <div class="column">
        <h1 class="top">404</h1>
        <h1 class="bottom">Page Not Found</h1>
        <h5>Looks like we can't find what you're looking for.</h5>
        <a href="<?= get_home_url(); ?>" class="button primary">Return Home</a>
    </div>
</section>

<?php get_footer(); ?>
