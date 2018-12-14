<section class="hero carousel">
  <?php 
    $slide_counter = 1;
    if( have_rows('hero') ): 
      while ( have_rows('hero') ) : the_row();
        if( have_rows('slide') ): 
          while ( have_rows('slide') ) : the_row();
            $image = get_sub_field('image')['url'];
            $title = get_sub_field('title');
            $subtext = get_sub_field('subtext');
  ?>

  <div class="column" style="background-image: url('<?= $image; ?>');">
    <div>
      <?php if($slide_counter === 1) { ?>
        <h1><?= $title ?></h1>
      <?php } else { ?>
        <h2><?= $title ?></h2>
      <?php } ?>

      <?php if($subtext): ?>
        <h6><?= $subtext; ?></h6>
      <?php endif; ?>

      <?php 
        $btn_count = count(get_sub_field('buttons'));
        if( have_rows('buttons') ): 
      ?>
        <div class="buttons <?php if($btn_count > 1) { echo 'two'; } ?>">

          <?php
            while ( have_rows('buttons') ) : the_row();
              $link = get_sub_field('link');
              $type = get_sub_field('type');
          ?>
            <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>" class="button <?= $type; ?>"><?= $link['title']; ?></a>
          <?php endwhile; ?>

        </div>
      <?php endif; ?>

    </div>
  </div>

  <?php
          $slide_counter++; 
          endwhile;
        endif;
      endwhile;
    endif; 
  ?>
</section>