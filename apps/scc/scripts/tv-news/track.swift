// Per-frame face landmarks (Vision, 76-point constellation + pupils = 87) and
// shoulders/neck (body pose) of a video. One JSON line per frame:
// {"t":sec,"face":[x,y,...] | null,"box":[x,y,w,h],"body":[lsx,lsy,rsx,rsy,nx,ny] | null}
// Coordinates are frame fractions, origin top-left.
// usage: track <video> <out.jsonl> [hintX hintY]   (hint picks the face nearest that point)
import AVFoundation
import Foundation
import Vision

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let hint: (Double, Double)? = args.count >= 5 ? (Double(args[3])!, Double(args[4])!) : nil
FileManager.default.createFile(atPath: args[2], contents: nil)
let out = FileHandle(forWritingAtPath: args[2])!
// Optional person mask: MASK=<path> MW=<w> MH=<h> in the environment writes w*h bytes per frame.
let env = ProcessInfo.processInfo.environment
let maskPath = env["MASK"]
let mw = Int(env["MW"] ?? "152")!, mh = Int(env["MH"] ?? "270")!
var maskOut: FileHandle? = nil
if let m = maskPath { FileManager.default.createFile(atPath: m, contents: nil); maskOut = FileHandle(forWritingAtPath: m) }

let asset = AVURLAsset(url: url)
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
])
reader.add(output)
reader.startReading()

func r(_ v: Double) -> Double { (v * 10000).rounded() / 10000 }

var frames = 0
while let sample = output.copyNextSampleBuffer() {
  guard let buffer = CMSampleBufferGetImageBuffer(sample) else { continue }
  let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
  let faceRequest = VNDetectFaceLandmarksRequest()
  faceRequest.constellation = .constellation76Points
  let bodyRequest = VNDetectHumanBodyPoseRequest()
  let handler = VNImageRequestHandler(cvPixelBuffer: buffer, orientation: .up)
  try? handler.perform([faceRequest, bodyRequest])
  if let mo = maskOut {
    let seg = VNGeneratePersonSegmentationRequest()
    seg.qualityLevel = .accurate
    seg.outputPixelFormat = kCVPixelFormatType_OneComponent8
    try? handler.perform([seg])
    var bytes = [UInt8](repeating: 0, count: mw * mh)
    if let pb = seg.results?.first?.pixelBuffer {
      CVPixelBufferLockBaseAddress(pb, .readOnly)
      let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), row = CVPixelBufferGetBytesPerRow(pb)
      let base = CVPixelBufferGetBaseAddress(pb)!.assumingMemoryBound(to: UInt8.self)
      for y in 0..<mh { for x in 0..<mw {
        let sx = min(w - 1, (x * w + w / 2) / mw), sy = min(h - 1, (y * h + h / 2) / mh)
        bytes[y * mw + x] = base[sy * row + sx]
      } }
      CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    }
    mo.write(Data(bytes))
  }

  var line: [String: Any] = ["t": r(t)]
  let faces = faceRequest.results ?? []
  let chosen = faces.min { a, b in
    func score(_ f: VNFaceObservation) -> Double {
      if let h = hint {
        let cx = Double(f.boundingBox.midX), cy = 1 - Double(f.boundingBox.midY)
        return (cx - h.0) * (cx - h.0) + (cy - h.1) * (cy - h.1)
      }
      return -Double(f.boundingBox.width)
    }
    return score(a) < score(b)
  }
  var faceCentreX = hint?.0 ?? 0.5
  if let face = chosen, let marks = face.landmarks {
    let box = face.boundingBox
    faceCentreX = Double(box.midX)
    var flat: [Double] = []
    let regions = [marks.faceContour, marks.leftEyebrow, marks.rightEyebrow, marks.leftEye, marks.rightEye,
                   marks.leftPupil, marks.rightPupil, marks.noseCrest, marks.nose, marks.medianLine,
                   marks.outerLips, marks.innerLips]
    for region in regions {
      for p in region?.normalizedPoints ?? [] {
        flat.append(r(Double(box.minX) + Double(p.x) * Double(box.width)))
        flat.append(r(1 - (Double(box.minY) + Double(p.y) * Double(box.height))))
      }
    }
    line["face"] = flat
    line["box"] = [r(Double(box.minX)), r(1 - Double(box.maxY)), r(Double(box.width)), r(Double(box.height))]
    line["roll"] = r(face.roll?.doubleValue ?? 0)
    line["yaw"] = r(face.yaw?.doubleValue ?? 0)
  }
  // The body whose neck is nearest the chosen face.
  var best: ([Double], Double)? = nil
  for body in bodyRequest.results ?? [] {
    guard let ls = try? body.recognizedPoint(.leftShoulder), let rs = try? body.recognizedPoint(.rightShoulder),
          let neck = try? body.recognizedPoint(.neck), ls.confidence > 0.2, rs.confidence > 0.2, neck.confidence > 0.2 else { continue }
    let d = abs(Double(neck.location.x) - faceCentreX)
    if best == nil || d < best!.1 {
      best = ([r(Double(ls.location.x)), r(1 - Double(ls.location.y)), r(Double(rs.location.x)), r(1 - Double(rs.location.y)),
               r(Double(neck.location.x)), r(1 - Double(neck.location.y))], d)
    }
  }
  if let b = best { line["body"] = b.0 }
  let data = try! JSONSerialization.data(withJSONObject: line)
  out.write(data)
  out.write("\n".data(using: .utf8)!)
  frames += 1
}
print("frames", frames)
