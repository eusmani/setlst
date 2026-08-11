# Adds each target's PrivacyInfo.xcprivacy to its Resources build phase.
#
# Writing the file isn't enough — a manifest that isn't in a Copy Resources
# phase never reaches the bundle, and App Store Connect reports it missing
# exactly as if it didn't exist. Idempotent: safe to re-run.
#
#   gem install --user-install xcodeproj
#   ruby scripts/add-privacy-manifests.rb

require "xcodeproj"

PROJECT = "ios/App/App.xcodeproj"
# target name => path of its manifest, relative to the project directory
MANIFESTS = {
  "App"           => "App/PrivacyInfo.xcprivacy",
  "SETLSTWidget"  => "SETLSTWidget/PrivacyInfo.xcprivacy",
  "SETLSTShare"   => "SETLSTShare/PrivacyInfo.xcprivacy",
}.freeze

project = Xcodeproj::Project.open(PROJECT)
changed = false

MANIFESTS.each do |target_name, rel_path|
  target = project.targets.find { |t| t.name == target_name }
  unless target
    warn "  ! no target named #{target_name} — skipped"
    next
  end

  on_disk = File.join(File.dirname(PROJECT), rel_path)
  unless File.exist?(on_disk)
    warn "  ! #{on_disk} does not exist — skipped"
    next
  end

  already = target.resources_build_phase.files.any? do |bf|
    bf.file_ref && bf.file_ref.path.to_s.end_with?("PrivacyInfo.xcprivacy")
  end
  if already
    puts "  = #{target_name}: already in Resources"
    next
  end

  # Reuse an existing file reference if the project already knows the path,
  # so re-running can't leave duplicate refs behind.
  ref = project.files.find { |f| f.real_path.to_s == File.expand_path(on_disk) }
  ref ||= begin
    group = project.main_group.find_subpath(File.dirname(rel_path), true)
    group.new_reference(File.basename(rel_path))
  end

  target.resources_build_phase.add_file_reference(ref, true)
  changed = true
  puts "  + #{target_name}: PrivacyInfo.xcprivacy added to Resources"
end

if changed
  project.save
  puts "saved #{PROJECT}"
else
  puts "nothing to change"
end
