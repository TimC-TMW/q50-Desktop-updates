def getPackagesByGroup(id) 
  # Create an array to return the packages
  packages = Array.new() 

  # Get the specified package group
  package_group = @cfg.model.package_groups["#{id}"]
  
  # Gather the appropriate packages into the package array
  package_group.included_packages.each do |package_id|
    package = @cfg.model.packages["#{package_id}"]
    package['package_id'] = package_id
    packages.push(package)
  end

  return packages
end

def getSpecTrims(models) 
  trims = Array.new() 
  models.each do |model|
    index = @cfg.trimindex.index(model)
    trims.push(@cfg.model.trims[index])
  end
  return trims
end
  
def addClasses(trim, classes)
  baseClass = "trim #{trim.code}"

  returnClass = baseClass
  if(classes != nil)
    returnClass = baseClass + ' '+classes 
  end
  if(trim.engine.engine_id.downcase == 'std')
    returnClass = returnClass + ' standard'
  elsif(trim.engine.engine_id.downcase == 'hyb')
    returnClass = returnClass + ' hybrid'
  end
  return returnClass
end
  
def translateValue(value)
    case value
    when -1
      value = I18n.t("specs.common.na_marker")
    when 0
      value = I18n.t("specs.common.optional_marker")
    when 1
      value = I18n.t("specs.common.standard_marker")
    end
    return value
end

def getPackageAvailablity(package_id, package_groups)
  package_groups.each do |package_group_id|
    curr_package_group = @cfg.model.package_groups["#{package_group_id}"]
    package_available = curr_package_group.included_packages.detect { |pid| pid == package_id }

    if package_available != nil
      return moneyFormat(@cfg.model.packages["#{package_id}"].price, @cfg.currency)
	  #@cfg.model.packages["#{package_id}"].price
    end
  end

  return 'N/A'
end