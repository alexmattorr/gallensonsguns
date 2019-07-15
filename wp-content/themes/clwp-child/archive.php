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
      <h1><?= single_cat_title('', false); ?></h1>
      <h3><?= $parent; ?></h3>
    </div>
  </div>
</section>

<section class="products-wrapper">
  <?php get_template_part('template-parts/part', 'sidebar'); ?>

  <div class="products">
  <?php
    if(have_posts()) : 
      while(have_posts()) : the_post();
  ?>
    <div class="column">
      <?php get_template_part('template-parts/part', 'product'); ?>
    </div>
  <?php
      endwhile;
    else:
      echo '<div class="archive-404"><h2>No ' . single_cat_title('', false) . ' ' . $parent . ' found</h2>';
    endif;
  ?>
  </div>
</section>

<?php get_footer(); ?>
