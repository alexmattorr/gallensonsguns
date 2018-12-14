<div class="row">
  <?php
    if( have_rows('list_item') ):
      while ( have_rows('list_item') ) : the_row();
        $title = get_sub_field('title');
        $text = get_sub_field('text');
  ?>
  <div class="column small-12 list-item">
    <div><h3><?= $title; ?></h3></div>
    <div><?= $text; ?></div>
  </div>
  <?php
      endwhile;
    endif;
  ?>
</div>