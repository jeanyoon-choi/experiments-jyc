import CoreGraphics
import Foundation
import ImageIO
import Vision

let sourceDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/0908/tech-power-faces", isDirectory: true)
let outputDirectory = URL(fileURLWithPath: "apps/goldfishes/public/images/0908/tech-power-eyes", isDirectory: true)
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
    throw NSError(domain: "TechPowerEyeCrop", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not decode \(url.path)"])
  }
  return image
}

func largestFace(in image: CGImage) throws -> VNFaceObservation {
  let request = VNDetectFaceLandmarksRequest()
  try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }) else {
    throw NSError(domain: "TechPowerEyeCrop", code: 2, userInfo: [NSLocalizedDescriptionKey: "No face detected"])
  }
  return face
}

func eyeCrop(for face: VNFaceObservation, image: CGImage) throws -> CGImage {
  guard let eye = face.landmarks?.leftEye ?? face.landmarks?.rightEye else {
    throw NSError(domain: "TechPowerEyeCrop", code: 3, userInfo: [NSLocalizedDescriptionKey: "No eye landmark detected"])
  }

  let points = eye.normalizedPoints
  let eyeMinX = points.map(\.x).min() ?? 0.5
  let eyeMaxX = points.map(\.x).max() ?? 0.5
  let eyeMinY = points.map(\.y).min() ?? 0.5
  let eyeMaxY = points.map(\.y).max() ?? 0.5
  let eyeCenterX = face.boundingBox.minX + CGFloat((eyeMinX + eyeMaxX) / 2) * face.boundingBox.width
  let eyeCenterY = face.boundingBox.minY + CGFloat((eyeMinY + eyeMaxY) / 2) * face.boundingBox.height
  let eyeWidth = CGFloat(eyeMaxX - eyeMinX) * face.boundingBox.width * CGFloat(image.width)
  let faceWidth = face.boundingBox.width * CGFloat(image.width)
  let side = min(CGFloat(min(image.width, image.height)), max(eyeWidth * 2.35, faceWidth * 0.2))
  let centerX = eyeCenterX * CGFloat(image.width)
  let centerYFromTop = (1 - eyeCenterY) * CGFloat(image.height)
  let originX = min(max(0, centerX - side / 2), CGFloat(image.width) - side)
  let originY = min(max(0, centerYFromTop - side / 2), CGFloat(image.height) - side)
  let cropRect = CGRect(x: floor(originX), y: floor(originY), width: floor(side), height: floor(side)).integral

  guard let crop = image.cropping(to: cropRect) else {
    throw NSError(domain: "TechPowerEyeCrop", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not crop eye"])
  }
  return crop
}

func writeJPEG(_ image: CGImage, to url: URL) throws {
  guard let destination = CGImageDestinationCreateWithURL(url as CFURL, "public.jpeg" as CFString, 1, nil) else {
    throw NSError(domain: "TechPowerEyeCrop", code: 5, userInfo: [NSLocalizedDescriptionKey: "Could not create \(url.path)"])
  }
  CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.92] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else {
    throw NSError(domain: "TechPowerEyeCrop", code: 6, userInfo: [NSLocalizedDescriptionKey: "Could not write \(url.path)"])
  }
}

try fileManager.createDirectory(at: outputDirectory, withIntermediateDirectories: true)
let sourceFiles = try fileManager.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil)
  .filter { matchesPortrait($0.lastPathComponent) }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }

guard sourceFiles.count == 80 else {
  throw NSError(domain: "TechPowerEyeCrop", code: 7, userInfo: [NSLocalizedDescriptionKey: "Expected 80 portraits, found \(sourceFiles.count)"])
}

var expectedOutputs = Set<String>()
for sourceURL in sourceFiles {
  let identifier = String(sourceURL.deletingPathExtension().lastPathComponent.prefix(3))
  let outputName = "\(identifier).jpg"
  let outputURL = outputDirectory.appendingPathComponent(outputName)
  do {
    let image = try cgImage(at: sourceURL)
    let face = try largestFace(in: image)
    try writeJPEG(try eyeCrop(for: face, image: image), to: outputURL)
    expectedOutputs.insert(outputName)
    print("\(identifier) \(image.width)x\(image.height) -> \(outputName)")
  } catch {
    throw NSError(domain: "TechPowerEyeCrop", code: 8, userInfo: [NSLocalizedDescriptionKey: "\(sourceURL.lastPathComponent): \(error.localizedDescription)"])
  }
}

for url in try fileManager.contentsOfDirectory(at: outputDirectory, includingPropertiesForKeys: nil) {
  if matchesPortrait(url.lastPathComponent), !expectedOutputs.contains(url.lastPathComponent) {
    try fileManager.removeItem(at: url)
  }
}
