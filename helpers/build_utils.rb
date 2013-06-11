def getTrimPackageGroups(trim_id) 
  # Create an array for the trims package groups, to return
  package_groups = Array.new()

  # Use an enumerable to get the current trim by it's trim_id
  curr_trim = getTrim(@cfg.model.trims, trim_id)

  # Loop over package groups and packages to populate package array
  curr_trim.package_groups.each do |package_group_id|
    # Save the package group hash to a variable so we can add the group id to it
    package_group = @cfg.model.package_groups["#{package_group_id}"]

    # Append the group id to the package group hash
    package_group['group_id'] = package_group_id

    # Append the package group to the package group array
    package_groups.push(package_group)
  end

  return package_groups
end

def getPackageGroupPrice(package_group)
  package_group_price = 0

  package_group.included_packages.each do |package_id|
    package = @cfg.model.packages["#{package_id}"]

    package_group_price = package_group_price + package.price
  end

  return package_group_price
end

def getTrimPackages(trim_id) 
  # Create an array for packages, to return
  packages = Array.new() 

  # Use an enumerable to get the current trim by it's trim_id
  curr_trim = getTrim(@cfg.model.trims, trim_id)

  # Loop over package groups and packages to populate package array
  curr_trim.package_groups.each do |package_group|
    included_packages = @cfg.model.package_groups["#{package_group}"].included_packages

    included_packages.each do |package_id|
      # Use an enumerable to do a check for identical packages
      package_exists = packages.detect { |p| p.package_id == package_id }

      # Only add packages if they haven't been 
      if package_exists == nil
        # Save the package hash to a varibalb eso we can add the package id to it
        package = @cfg.model.packages["#{package_id}"]

        # Append the package id to the package hash
        package['package_id'] = package_id

        # Append the package to the packages array
        packages.push(package)
      end
    end
  end

  return packages
end

def getTrim(trims, trim_id)
  # Pull the current trim out of an array of trims
  curr_trim = trims.detect { |trim| trim.code == trim_id }

  return curr_trim
end 

def packageExists(package_groups, package_id)
  # Check a package group for a package id
  package_exists = package_groups.detect { |pg_pid| pg_pid == package_id }

  return package_exists
end