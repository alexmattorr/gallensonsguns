<header class="header-bottom">
  <div class="column">
    <?php 
      get_template_part('template-parts/part', 'logo');

      $query = array(
        'post_type' => 'global',
        'posts_per_page' => 1,
      );

      $loop = new WP_Query($query);
      while ( $loop->have_posts() ) : $loop->the_post();
    ?>

    <ul>
      <?php
        if( have_rows('header_menu') ): 
          while ( have_rows('header_menu') ) : the_row();
            $link = get_sub_field('link');
      ?>
      <li><a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>"><?= $link['title']; ?></a></li>
      <?php
          endwhile;
        endif; 
      ?>
    </ul>
    <?php 
      endwhile;
      wp_reset_query(); 
    ?>
  </div>
</header>

