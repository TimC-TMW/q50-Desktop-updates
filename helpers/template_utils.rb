# For compressing inline javascript strings
def minify_inline_js(js_string)
  # require 'uglifier'
  # Uglifier.new.compile(js_string)
  js_string.gsub(/[\n\t]/, "") # remove all whitespace 
end

# Money Format
def moneyFormat(price, currency)
  return Money.new_with_dollars(price, currency).format(:no_cents => true)
end
def moneyFormatPlain(price, currency)
  return Money.new_with_dollars(price, currency).format(:no_cents => true, :symbol => false)
end
def moneyFormatTest(price, currency)
  return Money.new(price, currency)
end