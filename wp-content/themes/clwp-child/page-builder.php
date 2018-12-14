<div>
  <!-- builds hero -->
  <?php
    $add_hero = get_field('add_hero');
    if($add_hero === 'yes'):
      get_template_part('template-parts/part', 'hero');
    endif; 

    if( have_rows('sections') ):
      while ( have_rows('sections') ) : the_row();
        $bg_type = get_sub_field('background_type');
        $bg_color = 'bg-' . get_sub_field('background_color');
        $bg_image = get_sub_field('background_image')['url'];
        $bg_image_string = 'style="background-image: url(' . $bg_image . ')"';
  ?>

  <?php if($bg_type === 'image') { ?>
  <section class="bg-image" <?= $bg_image_string; ?>>
  <?php } else { ?>
  <section class="<?= $bg_color; ?>">
  <?php } ?>

  <!-- builds layouts -->
  <?php
    if( have_rows('layout') ):
      while ( have_rows('layout') ) : the_row();
        if( get_row_layout() == 'blocks' ):
          get_template_part('layouts/layout', 'blocks');
        elseif( get_row_layout() == 'brands' ):
          get_template_part('layouts/layout', 'brands');
        elseif( get_row_layout() == 'buttons' ):
          get_template_part('layouts/layout', 'buttons');
        elseif( get_row_layout() == 'image_carousel' ):
          get_template_part('layouts/layout', 'image-carousel');
        elseif( get_row_layout() == 'list' ):
          get_template_part('layouts/layout', 'list');
        elseif( get_row_layout() == 'products' ):
          get_template_part('layouts/layout', 'products');
        elseif( get_row_layout() == 'side_by_side' ):
          get_template_part('layouts/layout', 'side-by-side');
        elseif( get_row_layout() == 'text' ):
          get_template_part('layouts/layout', 'text');
        elseif( get_row_layout() == 'title' ):
          get_template_part('layouts/layout', 'title');
        elseif( get_row_layout() == 'wysiwyg_editor' ):
          get_template_part('layouts/layout', 'wysiwyg-editor');
        endif;
      endwhile;
    endif;
  ?> 

  </section>

  <?php
      endwhile;
    endif;
  ?>
</div>