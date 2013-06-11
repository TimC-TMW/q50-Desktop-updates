###
# Compass
###

# Susy grids in Compass
# First: gem install susy --pre
# require 'susy'

# Change Compass configuration
# compass_config do |config|
#   config.output_style = :compact
# end

###
# Page options, layouts, aliases and proxies
###

# Per-page layout changes:
#
# With no layout
# page "/path/to/file.html", :layout => false
#
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
#
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy (fake) files
# page "/this-page-has-no-template.html", :proxy => "/template-file.html" do
#   @which_fake_page = "Rendering a fake page with a variable"
# end

###
# Helpers
###

# Automatic image dimensions on image_tag helper
# activate :automatic_image_sizes

# Methods defined in the helpers block are available in templates
helpers do
  
  # For compressing inline javascript strings
  def minify_inline_js(js_string)
    # require 'uglifier'
    # Uglifier.new.compile(js_string)
    js_string.gsub(/[\n\t]/, "") # remove all whitespace 
  end
end

# set :strip_index_file, false # keep index.html pages in URLs

# Use i18n
activate :i18n, :mount_at_root => :false
set :css_dir, 'css'
set :js_dir, 'js'
set :images_dir, 'media'
set :relative_links, false
set :relative_assets, true
set :debug_assets, true

set :handraiser_post_url, "http://stage.infinitiusa.com/iapps/handraiser" #dev
set :ms_prefix, "http://www.stage.infinitiusa.com"

set :handraiser_vehiclecode, '5C13001'
set :handraiser_leadsourceid, '10178'

# Build-specific configuration
configure :build do

  set :environment, ENV['TARGET'] || :production # set our build environment

  if settings.environment.eql? "stage"
    set :handraiser_post_url, "http://stage.infinitiusa.com/iapps/handraiser" #stage
    set :ms_prefix, "http://www.stage.infinitiusa.com"
  else
    set :handraiser_post_url, "http://www.infinitiusa.com/iapps/handraiser" #prod
    set :ms_prefix, "http://www.infinitiusa.com"
  end

  activate :i18n, :mount_at_root => :false
  set :debug_assets, false
  set :build_dir, "build/"
  set :http_prefix, "/"

  # set :css_dir, 'g-sedan-new/css'
  # set :js_dir, 'g-sedan-new/js'
  # set :images_dir, 'g-sedan-new/media'

  # Minify HTML on build
  
  # activate :minify_html
  
  # Minify CSS on build
  
  # activate :minify_css
  
  # Minify Javascript on build
  
  # activate :minify_javascript
  

  # Enable cache buster
  # activate :cache_buster

  # Use relative URLs
  # activate :relative_assets

  # Compress PNGs after build
  # First: gem install middleman-smusher
  # require "middleman-smusher"
  # activate :smusher

  # Or use a different image path
  # set :http_path, "/Content/images/"
end