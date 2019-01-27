
    <?php 
        $query = array(
            'post_type' => 'global',
            'posts_per_page' => 1,
        );

        $loop = new WP_Query($query);
        while ( $loop->have_posts() ) : $loop->the_post();
    ?>

    <footer class="top">
        <div class="row">

            <div class="footer-logo column small-12">
                <a href="<?= get_home_url(); ?>">
                    <img src="<?= get_field('footer_logo'); ?>" alt="Gallenson's Gun Shop">
                </a>
            </div>

            <div class="column small-12 hide-mobile">
                <h2>NOT LEGAL IN CALIFORNIA</h2>
            </div>

            <div class="footer-main column small-12 medium-4">
                <address>
                    166 East 200 South<br>
                    Salt Lake City, Utah 84111
                </address>

                <div class="hours">
                    <p>Open Monday - Saturday: 9AM to 6PM</p>
                </div>

                <div>
                    <a href="tel:801-328-2016">801-328-2016</a>
                </div>

                <div>
                    <a href="mailto:gallensonsmail@gmail.com">gallensonsmail@gmail.com</a>
                </div>
            </div>

            <div class="column small-12 medium-4 hide-mobile">
            <?php 
                $count = 0; 
                $amount_split = count(get_field('footer_menu')) / 2;
                while (have_rows('footer_menu')) {
                    the_row();
                    $link = get_sub_field('link');
                    if ($count > 0 && ($count % $amount_split == 0)) {
            ?>
                </div>
                <div class="column small-12 medium-4 hide-mobile">
            <?php } ?>
                <div class="footer-menu-item">
                    <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>"><?= $link['title']; ?></a>
                    <ul>
                        <?php
                            while ( have_rows('sub_item') ) : the_row();
                                $link = get_sub_field('link');
                        ?>
                        <li>
                            <a href="<?= $link['url']; ?>" target="<?= $link['target']; ?>"><?= $link['title']; ?></a>
                        </li>
                        <?php endwhile; ?>
                    </ul>
                </div>
            <?php 
                $count++;
                }
            ?>       
            </div>

        </div>
    </footer>

    <footer class="bottom">
        <div class="column small-6">
            &copy; <?= date("Y"); ?> Gallenson's Gun Shops
        </div>
        <div class="column small-6">
            <ul class="footer-social">
                <?php
                    if( have_rows('footer_social') ): 
                        while ( have_rows('footer_social') ) : the_row();
                            $link = get_sub_field('link');
                            $type = get_sub_field('type');
                ?>
                <li>
                    <a href="<?= $link; ?>" target="_blank">
                        <?php include( get_stylesheet_directory() . '/assets/images/icons/social/' . $type . '.svg' ); ?>
                    </a>
                </li>
                <?php
                        endwhile;
                    endif; 
                ?>
            </ul>
        </div>
    </footer>

    <?php 
        endwhile;
        wp_reset_query(); 
    ?>
    
    </div> <!-- END MAX CONTAINER -->

    <div class="modal-bg"></div>

    <?php
        get_template_part('template-parts/part', 'google-analytics');
        do_action( 'clwp_layout_end' ); 
        wp_footer();
        do_action( 'clwp_before_closing_body' );
    ?>
</body>
</html>