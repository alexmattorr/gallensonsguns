<div class="row images carousel">
  <?php
    if( have_rows('image') ):
      while ( have_rows('image') ) : the_row();
        $image = get_sub_field('image')['sizes']['large'];
  ?>
  <div class="column">
    <figure style="background-image: url('<?= $image; ?>');"></figure>
  </div>
  <?php endwhile; endif; ?>
</div>