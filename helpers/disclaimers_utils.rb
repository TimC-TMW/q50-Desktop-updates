def buildDisclaimer(disclaimer)
  # Prepare a string for the disclaimers
  full_disclaimer = ""

  # Include titles
  if disclaimer.title and disclaimer.title.length > 0
    full_disclaimer << %Q[<p class="title">#{disclaimer.title}</p>]
  end

  # Include disclaimers as paragraphs
  if disclaimer.body
    disclaimer.body.each do |paragraph|
      full_disclaimer << %Q[<p>#{paragraph}</p>]
    end
  end

  # Get pack of disclaimers for disclaimer groups
  if disclaimer.group
    disclaimer.group.each do |disclaimer_id|
      # Get the current disclaimer using the current disclaimers id
      group_disclaimer = @cfg.disclaimers["#{disclaimer_id}"]

      full_disclaimer << buildDisclaimer(group_disclaimer)
    end
  end

  return full_disclaimer
end