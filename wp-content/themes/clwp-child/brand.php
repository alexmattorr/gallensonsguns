<?php 
  /*
  Template Name: Brands
  */
  get_header();
?>

<div>

  <section class="bg-light-gray">
    <div class="row">
      <div class="column title">
        <h3>Featured Brands</h3>
      </div>
    </div>

    <div class="row side-by-sides">
      <?php
        $query = array(
          'post_type' => 'brands',
          'category_name' => 'Featured Brand',
          'order' => 'asc',
          'orderby' => 'title',
        );

        $loop = new WP_Query($query);
        while ( $loop->have_posts() ) : $loop->the_post();
          $bg_image = get_field('highlight_image')['sizes']['large'];
          $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
          $title = get_the_title();
          $link = get_permalink();
      ?>
      <div class="row brand-side-by-side side-by-side">
        <div class="column small-12 medium-6" style="background-image: url('<?= $bg_image; ?>');"></div>
        <div class="column small-12 medium-6">
          <div>
            <a href="<?= $link; ?>"><img src="<?= $image; ?>" alt="<?php the_title(); ?>"></a>
            <h4 style="display: none;"><?php the_title(); ?></h4>
            <?php the_content(); ?>
            <a href="<?= $link; ?>">View Brand</a>
          </div>
        </div>
      </div>
      <?php endwhile; wp_reset_query(); ?>

    </div>
  </section>

  <section>
    <div class="row">
      <div class="column title">
        <h1 class="h3">Brands We Carry</h1>
      </div>
    </div>

    <div class="row">
      <?php
        $query = array(
          'post_type' => 'brands',
          'category__not_in' => 2,
          'order' => 'asc',
          'orderby' => 'title',
        );

        $loop = new WP_Query($query);
        while ( $loop->have_posts() ) : $loop->the_post();
          $image = wp_get_attachment_image_src( get_post_thumbnail_id( $post->ID ), 'single-post-thumbnail' )[0];
          $title = get_the_title();
          $link = get_permalink();
      ?>
      <div class="column small-6 medium-3 icon-item">
        <a href="<?= $link; ?>">
          <img src="<?= $image; ?>" alt="<?= $title; ?> Logo">
        </a>
      </div>
      <?php endwhile; wp_reset_query(); ?>

    </div>
  </section>
</div>

<?php get_footer();
