<?php
  $query = array(
    'post_type' => 'global',
    'posts_per_page' => 1,
  );

  $loop = new WP_Query($query);
  while ( $loop->have_posts() ) : $loop->the_post();
?>

<header class="header-top">
  <div class="column">
    <ul>
      <?php
        if( have_rows('header_menu_top') ): 
          while ( have_rows('header_menu_top') ) : the_row();
            $link = get_sub_field('link');
      ?>
      <li><a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>"><?= $link['title']; ?></a></li>
      <?php
          endwhile;
        endif;
      ?>
    </ul>
  </div>
</header>

<?php endwhile; wp_reset_query(); ?>