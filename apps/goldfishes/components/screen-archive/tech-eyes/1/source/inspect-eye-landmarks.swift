import Foundation
import ImageIO
import Vision

// Read-only extraction. Same left-eye and crop rules as the archived 2D source.
for argument in CommandLine.arguments.dropFirst() {
  let url = URL(fileURLWithPath: argument)
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { fatalError(argument) }
  let request = VNDetectFaceLandmarksRequest()
  try VNImageRequestHandler(cgImage: image, orientation: .up).perform([request])
  guard let face = request.results?.max(by: { $0.boundingBox.width * $0.boundingBox.height < $1.boundingBox.width * $1.boundingBox.height }),
        let eye = face.landmarks?.leftEye ?? face.landmarks?.rightEye else { fatalError("No eye: \(argument)") }
  func pixels(_ region: VNFaceLandmarkRegion2D) -> [[Double]] {
    region.normalizedPoints.map { point in
      [Double((face.boundingBox.minX + CGFloat(point.x) * face.boundingBox.width) * CGFloat(image.width)),
       Double((1 - face.boundingBox.minY - CGFloat(point.y) * face.boundingBox.height) * CGFloat(image.height))]
    }
  }
  let points = pixels(eye)
  let minX = points.map { $0[0] }.min()!, maxX = points.map { $0[0] }.max()!
  let minY = points.map { $0[1] }.min()!, maxY = points.map { $0[1] }.max()!
  let side = max((maxX - minX) * 2.35, Double(face.boundingBox.width) * Double(image.width) * 0.2)
  let crop = [(minX + maxX - side) / 2, (minY + maxY - side) / 2, side]
  let pupil = face.landmarks?.leftPupil.map { pixels($0)[0] } ?? [(minX + maxX) / 2, (minY + maxY) / 2]
  let output: [String: Any] = ["file": url.lastPathComponent, "size": [image.width, image.height], "crop": crop, "eye": points, "pupil": pupil]
  print(String(data: try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys]), encoding: .utf8)!)
}
