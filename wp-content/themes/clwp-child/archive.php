<?php
/**
 * The template for displaying archive pages
 */

get_header(); ?>

<div class="main-wrap" role="main">
    <article class="main-content">
        <?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
            <?php the_content(); ?>
        <?php endwhile; endif; ?>
        <?php
        if ( function_exists( 'clwp_pagination' ) ) :
            clwp_pagination();
        elseif ( is_paged() ) :
        ?>
            <nav id="post-nav">
                <div class="post-previous"><?php next_posts_link( __( '&larr; Older posts', 'clwp' ) ); ?></div>
                <div class="post-next"><?php previous_posts_link( __( 'Newer posts &rarr;', 'clwp' ) ); ?></div>
            </nav>
        <?php endif; ?>

    </article>
    <?php get_sidebar(); ?>
</div>

<?php get_footer();
