
    <footer>
        <div class="column small-12 medium-4">
            <?php get_template_part('template-parts/part', 'logo'); ?>
        </div>

        <div class="column small-12 medium-8">
        </div>
    </footer>
    
    </div> <!-- END MAX CONTAINER -->

    <?php 
        do_action( 'clwp_layout_end' ); 
        wp_footer();
        do_action( 'clwp_before_closing_body' );
    ?>
</body>
</html>