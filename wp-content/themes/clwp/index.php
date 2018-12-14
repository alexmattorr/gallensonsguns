<?php
/**
 * The main template file
 */

get_header(); ?>

<div class="main-wrap" role="main">
    <article class="main-content">
    <?php if ( have_posts() ) : ?>

        <?php while ( have_posts() ) : the_post(); ?>
        
            <?php the_content(); ?>

        <?php endwhile; endif; ?>

    </article>
    <?php get_sidebar(); ?>

</div>

<?php get_footer();
