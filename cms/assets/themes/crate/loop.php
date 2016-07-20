<?php
/**
 * The loop that displays posts.
 *
 * The loop displays the posts and the post content.  See
 * http://codex.wordpress.org/The_Loop to understand it and
 * http://codex.wordpress.org/Template_Tags to understand
 * the tags used in it.
 *
 * This can be overridden in child themes with loop.php or
 * loop-template.php, where 'template' is the loop context
 * requested by a template. For example, loop-index.php would
 * be used if it exists and we ask for the loop with:
 * <code>get_template_part( 'loop', 'index' );</code>
 *
 * @package WordPress
 * @subpackage crate
 * @since crate 1.0
 */
?>

<?php /* Display navigation to next/previous pages when applicable */ ?>
<div id="main">
<?php if ( $wp_query->max_num_pages > 1 ) : ?>
	<nav id="nav-above" class="navigation">
		<div class="nav-previous"><?php next_posts_link( __( '<span class="meta-nav">&larr;</span> Older posts', 'crate' ) ); ?></div>
		<div class="nav-next"><?php previous_posts_link( __( 'Newer posts <span class="meta-nav">&rarr;</span>', 'crate' ) ); ?></div>
	</nav><!-- #nav-above -->
<?php endif; ?>

<?php /* If there are no posts to display, such as an empty archive page */ ?>
<?php if ( ! have_posts() ) : ?>
	<article id="post-0" class="post error404 not-found">
		<h1 class="entry-title"><?php _e( 'Not Found', 'crate' ); ?></h1>
		<div class="entry-content">
			<p><?php _e( 'Apologies, but no results were found for the requested archive. Perhaps searching will help find a related post.', 'crate' ); ?></p>
			<?php get_search_form(); ?>
		</div><!-- .entry-content -->
	</article><!-- #post-0 -->
<?php endif; ?>

<?php while ( have_posts() ) : the_post(); ?>

	<article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
		<h2 class="entry-title"><a href="<?php the_permalink(); ?>" title="<?php printf( esc_attr__( 'Permalink to %s', 'crate' ), the_title_attribute( 'echo=0' ) ); ?>" rel="bookmark"><?php the_title(); ?></a></h2>

		<div class="entry-meta">
			<?php crate_posted_on(); ?>
		</div><!-- .entry-meta -->

<?php if ( is_archive() || is_search() ) : // Only display excerpts for archives and search. ?>
		<div class="entry-summary">
			<?php the_excerpt(); ?>
		</div><!-- .entry-summary -->
<?php else : ?>
		<div class="entry-content">
			<?php the_content( __( 'Continue reading <span class="meta-nav">&rarr;</span>', 'crate' ) ); ?>
			<?php wp_link_pages( array( 'before' => '<div class="page-link">' . __( 'Pages:', 'crate' ), 'after' => '</div>' ) ); ?>
		</div><!-- .entry-content -->
<?php endif; ?>

		<footer class="entry-utility">
			<?php if ( count( get_the_category() ) ) : ?>
				<?php printf( __( 'Posted in %2$s', 'crate' ), 'entry-utility-prep entry-utility-prep-cat-links', get_the_category_list( ', ' ) ); ?>
				|
			<?php endif; ?>
			<?php
				$tags_list = get_the_tag_list( '', ', ' );
				if ( $tags_list ):
			?>
				<?php printf( __( 'Tagged %2$s', 'crate' ), 'entry-utility-prep entry-utility-prep-tag-links', $tags_list ); ?>
				|
			<?php endif; ?>
			<?php comments_popup_link( __( 'Leave a comment', 'crate' ), __( '1 Comment', 'crate' ), __( '% Comments', 'crate' ) ); ?>
			<?php edit_post_link( __( 'Edit', 'crate' ), '| ', '' ); ?>
		</footer><!-- .entry-utility -->
	</article><!-- #post-## -->

	<?php comments_template( '', true ); ?>

<?php endwhile; // End the Loop. ?>

<?php /* Display navigation to next/previous pages when applicable */ ?>
<?php if (  $wp_query->max_num_pages > 1 ) : ?>
	<nav id="nav-below" class="navigation">
		<?php next_posts_link( __( '&larr; Older posts', 'crate' ) ); ?>
		<?php previous_posts_link( __( 'Newer posts &rarr;', 'crate' ) ); ?>
	</nav><!-- #nav-below -->
<?php endif; ?>
</div>