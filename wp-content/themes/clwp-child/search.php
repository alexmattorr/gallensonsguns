<?php 
  /*
  Template Name: Products Archive
  */
  get_header();

  $term = get_queried_object();
  $cat = $query->taxonomy;
  $parent = get_term($term->parent, $cat)->name;

  $image = get_field('hero', $term)['sizes']['large'];;
?>
<section class="hero">
  <div class="column" style="background-image: url('<?= $image; ?>');">
    <div>
      <h1><?= get_search_query(); ?></h1>
    </div>
  </div>
</section>

<section class="products-wrapper">
  <?php get_template_part('template-parts/part', 'sidebar'); ?>

  <div class="products">
  <?php
    if(have_posts()) : 
      while(have_posts()) : the_post();
        if(get_post_type() === 'used_guns'):
  ?>
    <div class="column">
      <?php get_template_part('template-parts/part', 'product'); ?>
    </div>
  <?php
        endif;
      endwhile;
    else:
      echo '<div class="archive-404"><h2>' . get_search_query() . ' Not Found</h2>';
    endif;
  ?>
  </div>
</section>

<?php get_footer(); ?>
