# Adds TrackingPlugin.swift to the App target's compile sources.
#
# A Swift file that isn't in a build phase is invisible to the compiler, so the
# plugin would simply not exist at runtime and the bridge would report the
# method as unimplemented. Idempotent.
require "xcodeproj"

PROJECT = "ios/App/App.xcodeproj"
REL = "App/TrackingPlugin.swift"  # beside the other plugins; the "Native" group has no path of its own, so a file placed there resolves to App/ anyway

project = Xcodeproj::Project.open(PROJECT)
target = project.targets.find { |t| t.name == "App" } or abort("no App target")

if target.source_build_phase.files.any? { |f| f.file_ref&.path.to_s.end_with?("TrackingPlugin.swift") }
  puts "  = already in the App target"
else
  group = project.main_group.find_subpath(File.dirname(REL), true)
  ref = project.files.find { |f| f.real_path.to_s == File.expand_path(File.join(File.dirname(PROJECT), REL)) }
  ref ||= group.new_reference(File.basename(REL))
  target.source_build_phase.add_file_reference(ref, true)
  project.save
  puts "  + TrackingPlugin.swift added to the App target"
end
