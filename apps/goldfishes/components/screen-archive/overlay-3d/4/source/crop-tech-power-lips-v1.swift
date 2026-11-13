import CoreGraphics
import Foundation
import ImageIO
import Vision

let sourceDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/0908/tech-power-faces", isDirectory: true)
let outputDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/0908/tech-power-lips-v1", isDirectory: true)
let fileManager = FileManager.default
let portraitPattern = try NSRegularExpression(pattern: #"^\d{3}\.(?:jpe?g|png|webp)$"#, options: [.caseInsensitive])

func matchesPortrait(_ name: String) -> Bool {
  portraitPattern.firstMatch(in: name, range: NSRange(name.startIndex..., in: name)) != nil
}

func cgImage(at url: URL) throws -> CGImage {
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw NSError(domain: "TechPowerLipCrop", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not decode \(url.path)"])
  }
  return image
}

func largestFace(in image: CGImage) throws -> VNFaceObservation {
  let request = VNDetectFaceLandmarksRequest()
  try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else {
    throw NSError(domain: "TechPowerLipCrop", code: 2, userInfo: [NSLocalizedDescriptionKey: "No face detected"])
  }
  return face
}

func lipCrop(for face: VNFaceObservation, image: CGImage) throws -> CGImage {
  guard let lips = face.landmarks?.outerLips else {
    throw NSError(domain: "TechPowerLipCrop", code: 3, userInfo: [NSLocalizedDescriptionKey: "No outer-lip landmark detected"])
  }

  let points = lips.normalizedPoints
  let lipMinX = points.map(\.x).min() ?? 0.5
  let lipMaxX = points.map(\.x).max() ?? 0.5
  let lipMinY = points.map(\.y).min() ?? 0.5
  let lipMaxY = points.map(\.y).max() ?? 0.5
  let lipCenterX = face.boundingBox.minX + CGFloat((lipMinX + lipMaxX) / 2) * face.boundingBox.width
  let lipCenterY = face.boundingBox.minY + CGFloat((lipMinY + lipMaxY) / 2) * face.boundingBox.height
  let lipWidth = CGFloat(lipMaxX - lipMinX) * face.boundingBox.width * CGFloat(image.width)
  let faceWidth = face.boundingBox.width * CGFloat(image.width)
  let side = min(CGFloat(min(image.width, image.height)), max(lipWidth * 1.55, faceWidth * 0.28))
  let centerX = lipCenterX * CGFloat(image.width)
  let centerYFromTop = (1 - lipCenterY) * CGFloat(image.height)
  let originX = min(max(0, centerX - side / 2), CGFloat(image.width) - side)
  let originY = min(max(0, centerYFromTop - side / 2), CGFloat(image.height) - side)
  let cropRect = CGRect(x: floor(originX), y: floor(originY), width: floor(side), height: floor(side)).integral

  guard let crop = image.cropping(to: cropRect) else {
    throw NSError(domain: "TechPowerLipCrop", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not crop lips"])
  }
  return crop
}

func writeJPEG(_ image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.jpeg" as CFString, 1, nil) else {
    throw NSError(domain: "TechPowerLipCrop", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create \(url.path)"])
  }
  CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "TechPowerLipCrop", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not write \(url.path)"])
  }
}

try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
let sourceFiles = try fileManager.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil)
  .filter { matchesPortrait($0.lastPathComponent) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard sourceFiles.count == 80 else {
  throw NSError(domain: "TechPowerLipCrop", code: 7, userInfo: [NSLocalizedDescriptionKey: "Expected 80 portraits, found \(sourceFiles.count)"])
}

var expectedOutputs = Set<String>()
for sourceURL in sourceFiles {
  let identifier = String(sourceURL.deletingPathExtension().lastPathComponent.prefix(3))
  let outputName = "\(identifier).jpg"
  let outputURL = outputDirectory.appendingPathComponent(outputName)
  do {
    let image = try cgImage(at: sourceURL)
    let face = try largestFace(in: image)
    try writeJPEG(try lipCrop(for: face, image: image), to: outputURL)
    expectedOutputs.insert(outputName)
    print("\(identifier) \(image.width)x\(image.height) -> \(outputName)")
  } catch {
    throw NSError(domain: "TechPowerLipCrop", code: 8, userInfo: [NSLocalizedDescriptionKey: "\(sourceURL.lastPathComponent): \(error.localizedDescription)"])
  }
}

for url in try fileManager.contentsOfDirectory(at: outputDirectory, includingPropertiesForKeys: nil) {
  if matchesPortrait(url.lastPathComponent), !expectedOutputs.contains(url.lastPathComponent) {
    try fileManager.removeItem(at: url)
  }
}
