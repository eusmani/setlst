# Adds the SETLSTShare share-extension target. See add-widget-target.rb for why
# this uses the xcodeproj library rather than hand-edited pbxproj.
#
#   ruby scripts/add-share-target.rb
#
# Safe to re-run.
require "xcodeproj"

PROJECT = "ios/App/App.xcodeproj"
NAME = "SETLSTShare"

project = Xcodeproj::Project.open(PROJECT)
if project.targets.any? { |t| t.name == NAME }
  puts "#{NAME} already exists — nothing to do."
  exit 0
end

app = project.targets.find { |t| t.name == "App" } or abort "App target not found"
release = app.build_configurations.find { |c| c.name == "Release" }

ext = project.new_target(:app_extension, NAME, :ios, "17.0")
group = project.main_group.new_group(NAME, NAME)
ext.add_file_references([group.new_reference("ShareViewController.swift")])

ext.build_configurations.each do |config|
  s = config.build_settings
  s["PRODUCT_BUNDLE_IDENTIFIER"]  = "app.setlst.native.share"
  s["PRODUCT_NAME"]               = "$(TARGET_NAME)"
  s["INFOPLIST_FILE"]             = "#{NAME}/Info.plist"
  s["CODE_SIGN_ENTITLEMENTS"]     = "#{NAME}/#{NAME}.entitlements"
  s["DEVELOPMENT_TEAM"]           = release.build_settings["DEVELOPMENT_TEAM"]
  s["CODE_SIGN_STYLE"]            = "Automatic"
  s["IPHONEOS_DEPLOYMENT_TARGET"] = "17.0"
  s["SWIFT_VERSION"]              = "5.0"
  s["TARGETED_DEVICE_FAMILY"]     = "1,2"
  s["SKIP_INSTALL"]               = "YES"
  s["GENERATE_INFOPLIST_FILE"]    = "NO"
  s["MARKETING_VERSION"]          = release.build_settings["MARKETING_VERSION"]
  s["CURRENT_PROJECT_VERSION"]    = release.build_settings["CURRENT_PROJECT_VERSION"]
end

embed = app.build_phases.find { |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == "Embed App Extensions"
} || app.new_copy_files_build_phase("Embed App Extensions").tap { |p| p.symbol_dst_subfolder_spec = :plug_ins }

embed.add_file_reference(ext.product_reference, true)
app.add_dependency(ext)
project.save
puts "Added #{NAME} (app.setlst.native.share), embedded in App"
