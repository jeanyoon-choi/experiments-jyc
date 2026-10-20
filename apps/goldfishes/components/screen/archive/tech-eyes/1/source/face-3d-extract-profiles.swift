import AppKit
import Foundation
import Vision

// Usage: swift face-3d-extract-profiles.swift portrait-006.jpg ...
// Emits normalized, top-left-origin face boxes for the largest detected face.
// This is source preparation only; the browser never runs Vision.
for argument in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: argument)
  var record: [String: Any] = ["id": url.deletingPathExtension().lastPathComponent]
  guard let image = NSImage(contentsOf: url),
        let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    record["face"] = NSNull(); record["status"] = "image_unavailable"
    let data = try! JSONSerialization.data(withJSONObject: record); print(String(data: data, encoding: .utf8)!)
    continue
  }
  let request = VNDetectFaceRectanglesRequest()
  do {
    try VNImageRequestHandler(cgImage: cgImage, orientation: .up).perform([request])
    guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else {
      record["face"] = NSNull(); record["status"] = "face_not_found"
      let data = try JSONSerialization.data(withJSONObject: record); print(String(data: data, encoding: .utf8)!)
      continue
    }
    let box = face.boundingBox
    // Vision uses a bottom-left origin; the canvas crop uses top-left.
    record["face"] = [box.minX, 1 - box.maxY, box.width, box.height]
    record["status"] = box.width * box.height >= 0.035 ? "ok" : "face_too_small"
  } catch {
    record["face"] = NSNull(); record["status"] = "vision_failed"
  }
  let data = try JSONSerialization.data(withJSONObject: record)
  print(String(data: data, encoding: .utf8)!)
}
