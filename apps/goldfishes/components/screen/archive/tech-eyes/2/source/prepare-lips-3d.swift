import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

// Usage: swift prepare-lips-3d.swift --manifest lips-3d-profiles.generated.json id input output [...]
// It crops only matching local portraits. Missing or too-small outer-lip marks
// become explicit V2 fallbacks, never invented detail.
struct Mouth: Codable { let width: Double; let height: Double; let faceWidth: Double; let endpointLift: Double; let centerDip: Double }
struct Profile: Codable { let id: String; let sourceImage: String; let usable: Bool; let quality: String; let reason: String?; let mouth: Mouth? }
func clamp(_ value: CGFloat, _ lower: CGFloat, _ upper: CGFloat) -> CGFloat { min(max(value, lower), upper) }

func crop(_ id: String, _ input: URL, _ output: URL) -> Profile {
  do {
  guard let source = CGImageSourceCreateWithURL(input as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw NSError(domain: "Lips3D", code: 1, userInfo: [NSLocalizedDescriptionKey: "image_decode_failed"])
  }
  let request = VNDetectFaceLandmarksRequest()
  try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }),
        let lips = face.landmarks?.outerLips else {
    throw NSError(domain: "Lips3D", code: 2, userInfo: [NSLocalizedDescriptionKey: "outer_lips_not_found"])
  }
  let points = lips.normalizedPoints
  let minX = points.map(\.x).min()!, maxX = points.map(\.x).max()!
  let minY = points.map(\.y).min()!, maxY = points.map(\.y).max()!
  let width = (maxX - minX) * face.boundingBox.width * CGFloat(image.width)
  let height = (maxY - minY) * face.boundingBox.height * CGFloat(image.height)
  let centerPoints = points.filter { abs($0.x - (minX + maxX) * 0.5) < (maxX - minX) * 0.16 }
  let edgePoints = points.filter { $0.x < minX + (maxX - minX) * 0.18 || $0.x > maxX - (maxX - minX) * 0.18 }
  let centerLandmarkY = centerPoints.map(\.y).reduce(0, +) / CGFloat(max(1, centerPoints.count))
  let edgeY = edgePoints.map(\.y).reduce(0, +) / CGFloat(max(1, edgePoints.count))
  let observation = Mouth(width: Double(width), height: Double(height), faceWidth: Double(face.boundingBox.width * CGFloat(image.width)), endpointLift: Double((edgeY - centerLandmarkY) * face.boundingBox.height), centerDip: Double((maxY - centerLandmarkY) * face.boundingBox.height))
  guard width >= 26, height >= 12 else { return Profile(id: id, sourceImage: input.path, usable: false, quality: "too-small", reason: "outer_lips_\(Int(width))x\(Int(height))px", mouth: observation) }
  let cropWidth = min(CGFloat(image.width), max(8, width * 1.34))
  let cropHeight = min(CGFloat(image.height), max(8, max(height * 1.85, width * 0.52)))
  let centerX = (face.boundingBox.minX + (minX + maxX) * 0.5 * face.boundingBox.width) * CGFloat(image.width)
  let centerY = (1 - face.boundingBox.minY - (minY + maxY) * 0.5 * face.boundingBox.height) * CGFloat(image.height)
  let x = clamp(centerX - cropWidth * 0.5, 0, CGFloat(image.width) - cropWidth)
  let y = clamp(centerY - cropHeight * 0.5, 0, CGFloat(image.height) - cropHeight)
  guard let clipped = image.cropping(to: CGRect(x: x, y: y, width: cropWidth, height: cropHeight)) else {
    throw NSError(domain: "Lips3D", code: 3, userInfo: [NSLocalizedDescriptionKey: "crop_failed"])
  }
  try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let destination = CGImageDestinationCreateWithURL(output as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
    throw NSError(domain: "Lips3D", code: 4, userInfo: [NSLocalizedDescriptionKey: "jpeg_destination_failed"])
  }
  CGImageDestinationAddImage(destination, clipped, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else { throw NSError(domain: "Lips3D", code: 5, userInfo: [NSLocalizedDescriptionKey: "jpeg_write_failed"]) }
  return Profile(id: id, sourceImage: input.path, usable: true, quality: width >= 48 && height >= 20 ? "usable" : "limited", reason: nil, mouth: observation)
  } catch { return Profile(id: id, sourceImage: input.path, usable: false, quality: "unusable", reason: error.localizedDescription, mouth: nil) }
}

var values = Array(CommandLine.arguments.dropFirst())
var manifest: URL?
if values.first == "--manifest" { guard values.count >= 2 else { fatalError("Missing manifest path") }; manifest = URL(fileURLWithPath: values.remove(at: 1)); values.removeFirst() }
guard values.count > 0, values.count % 3 == 0 else { fatalError("Expected id input.jpg output.jpg triplets") }
var profiles: [Profile] = []
for offset in stride(from: 0, to: values.count, by: 3) {
  let result = crop(values[offset], URL(fileURLWithPath: values[offset + 1]), URL(fileURLWithPath: values[offset + 2])); profiles.append(result)
  print("\(result.id): \(result.quality)\(result.reason.map { " (\($0))" } ?? "")")
}
if let manifest { try JSONEncoder().encode(profiles).write(to: manifest, options: .atomic) }
