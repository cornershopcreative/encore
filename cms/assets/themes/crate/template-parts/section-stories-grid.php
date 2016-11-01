<?php
/**
 * The template for displaying Stories Grid sections.
 */
?>

	<div class="content-section section-stories-grid">

		<?php if ( $title = get_sub_field( 'title' ) ): ?>
			<h2 class="section-title"><?php echo wp_kses_post( wptexturize( $title ) ); ?></h2>
		<?php endif; ?>
		<?php

		$show_pager = get_sub_field( 'show_pager' );

		// Set up custom query.
		$story_query = crate_section_query( array(
			'post_type' => 'stories',
		) );

		?>

		<div class="content-section-grid container<?php echo ( $show_pager ? ' facetwp-template' : '' ); ?>">
			<?php while ( $story_query->have_posts() ) : $story_query->the_post(); ?>

				<article class="grid-item grid-item-3<?php if ( get_field( 'bright_spot' ) ) echo ' bright-spot'; ?>">

					<div class="entry-thumbnail">

						<?php echo get_the_post_thumbnail( null, 'grid-item-lg' ); ?>

						<div class="entry-quote">
							<?php the_field( 'quote' ); ?>
						</div>

					</div>

					<div class="entry-summary">

						<h3 class="entry-title">
							<a href="<?php echo esc_attr( get_permalink() ); ?>"><?php echo esc_html( get_the_title() ); ?></a>
						</h3>

						<p><?php the_field( 'subtitle' ); ?></p>

					</div>

					<a href="<?php echo esc_url( get_permalink() ); ?>" class="overlay-link"></a>

				</article>

			<?php endwhile; ?>
		</div>

		<?php if ( $show_pager ) : ?>
			<div class="button-group grid-pager container">
				<a class="button button-gold fwp-load-more" data-text-more="<?php esc_attr_e( 'Load More', 'crate' ); ?>" data-text-loading="<?php esc_attr_e( 'Loading...', 'crate' ); ?>"><?php esc_html_e( 'Load More', 'crate' ); ?></a>
			</div>
		<?php endif; ?>

		<?php wp_reset_postdata(); ?>

	</div>
