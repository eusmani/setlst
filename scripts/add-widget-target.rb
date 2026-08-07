# Adds the SETLSTWidget extension target to ios/App/App.xcodeproj.
#
# Done with the xcodeproj library rather than by hand: a target needs a native
# target, two build configurations, three build phases, a product reference, an
# embed-extension phase on the app, and a dependency edge — hand-editing that
# much pbxproj is how you end up with a project Xcode refuses to open.
#
#   gem install --user-install xcodeproj
#   ruby scripts/add-widget-target.rb
#
# Safe to re-run: exits early if the target already exists.
require "xcodeproj"

PROJECT = "ios/App/App.xcodeproj"
NAME    = "SETLSTWidget"
GROUP_ID = "group.app.setlst.native"

project = Xcodeproj::Project.open(PROJECT)

if project.targets.any? { |t| t.name == NAME }
  puts "#{NAME} target already exists — nothing to do."
  exit 0
end

app = project.targets.find { |t| t.name == "App" } or abort "App target not found"

widget = project.new_target(:app_extension, NAME, :ios, "17.0")

# Source files.
group = project.main_group.new_group(NAME, NAME)
swift = group.new_reference("#{NAME}.swift")
widget.add_file_references([swift])

# Build settings, mirroring the app's signing so archives don't need extra setup.
app_release = app.build_configurations.find { |c| c.name == "Release" }
# DEVELOPMENT_TEAM lives on the project-level configs here, not the App
# target's, so fall back to the project when the target has none.
team = app_release.build_settings["DEVELOPMENT_TEAM"]
team = project.build_configurations.first.build_settings["DEVELOPMENT_TEAM"] if team.to_s.empty?

widget.build_configurations.each do |config|
  s = config.build_settings
  s["PRODUCT_BUNDLE_IDENTIFIER"] = "app.setlst.native.widget"
  s["PRODUCT_NAME"]              = "$(TARGET_NAME)"
  s["INFOPLIST_FILE"]            = "#{NAME}/Info.plist"
  s["CODE_SIGN_ENTITLEMENTS"]    = "#{NAME}/#{NAME}.entitlements"
  s["DEVELOPMENT_TEAM"]          = team
  s["CODE_SIGN_STYLE"]           = "Automatic"
  s["IPHONEOS_DEPLOYMENT_TARGET"] = "17.0"
  s["SWIFT_VERSION"]             = "5.0"
  s["TARGETED_DEVICE_FAMILY"]    = "1,2"
  s["SKIP_INSTALL"]              = "YES"
  s["MARKETING_VERSION"]         = app_release.build_settings["MARKETING_VERSION"]
  s["CURRENT_PROJECT_VERSION"]   = app_release.build_settings["CURRENT_PROJECT_VERSION"]
  s["GENERATE_INFOPLIST_FILE"]   = "NO"
end

# Embed the extension in the app, and make the app depend on it.
embed = app.build_phases.find { |p|
  p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == "Embed App Extensions"
}
unless embed
  embed = app.new_copy_files_build_phase("Embed App Extensions")
  embed.symbol_dst_subfolder_spec = :plug_ins
end
embed.add_file_reference(widget.product_reference, true)
app.add_dependency(widget)

project.save
puts "Added #{NAME} (app.setlst.native.widget), embedded in App, group #{GROUP_ID}"
