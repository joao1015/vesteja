"use client";

// Imports de bibliotecas e funcionalidades
import toast, { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect, FormEvent } from 'react';
import Webcam from 'react-webcam';
import { VRScene } from '../components/VRScene';
import * as tf from '@tensorflow/tfjs-core';
import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';

// Imports da biblioteca Swiper para o carrossel 3D
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';


// --- Interfaces de Tipos ---
type Step = 'intro' | 'gender' | 'photo' | 'closet' | 'confirm' | 'loading' | 'result';
type Gender = 'masculino' | 'feminino';

interface Garment {
  id: number;
  name: string;
  category: string;
  gender: string[];
  description: string;
  imageUrl: string;
}

// --- Componentes Auxiliares ---
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- Componente Principal da Página ---
export default function VesteJaPage() {
    // --- Estados da Aplicação ---
    const [step, setStep] = useState<Step>('intro');
    const [activeGender, setActiveGender] = useState<Gender | null>(null);
    const [humanFile, setHumanFile] = useState<File | null>(null);
    const [humanFilePreview, setHumanFilePreview] = useState<string | null>(null);
    const [clothes, setClothes] = useState<Garment[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [selectedGarment, setSelectedGarment] = useState<Garment | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [showVR, setShowVR] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    // --- Carregamento Inicial do Catálogo ---
    useEffect(() => {
        fetch('/data/clothes.json').then(res => res.json()).then(setClothes);
    }, []);

    // --- Funções de Controle da Jornada ---

    const handleGenderSelect = (gender: Gender) => {
        setActiveGender(gender);
        const firstCategory = clothes.find(g => g.gender.includes(gender))?.category;
        setActiveCategory(firstCategory || null);
        setStep('photo');
    };

    const handlePhotoSelect = (file: File) => {
        setHumanFile(file);
        setHumanFilePreview(URL.createObjectURL(file));
        setStep('closet');
    };
    
    const handleGarmentSelect = (garment: Garment) => {
        setSelectedGarment(garment);
        setStep('confirm');
    }

    const handleProcess = async () => {
        if (!humanFile || !selectedGarment) {
            toast.error("Erro inesperado: Imagem ou roupa não encontrada.");
            return;
        }
        setStep('loading');
        setIsLoading(true);

        setLoadingMessage('Passo 1/3: Preparando sua imagem...');
        const t2 = setTimeout(() => setLoadingMessage('Passo 2/3: A IA está criando o look...'), 2000);
        const t3 = setTimeout(() => setLoadingMessage('Passo 3/3: Finalizando... Quase pronto!'), 5000);

        try {
            const garmentResponse = await fetch(selectedGarment.imageUrl);
            const garmentBlob = await garmentResponse.blob();
            const garmentFile = new File([garmentBlob], "garment.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append('human', humanFile);
            formData.append('garment', garmentFile);
            formData.append('description', selectedGarment.description);
            // Lembre-se que esta URL deve ser 'http://backend:8000/tryon' ao rodar com Docker
            const apiResponse = await fetch('http://localhost:8000/tryon', { method: 'POST', body: formData });
            const data = await apiResponse.json();
            if (!apiResponse.ok) throw new Error(data.error || "Ocorreu um erro no servidor.");
            setResultImage(data.output);
            toast.success("Look gerado com sucesso!");
            setStep('result');
        } catch (err: any) {
            toast.error(err.message || "Não foi possível conectar à API.");
            setStep('confirm');
        } finally {
            setIsLoading(false);
            clearTimeout(t2);
            clearTimeout(t3);
        }
    };
    
    const handleReset = () => {
        setStep('intro');
        setActiveGender(null);
        setHumanFile(null);
        setHumanFilePreview(null);
        setSelectedGarment(null);
        setResultImage(null);
    }

    // --- Renderização Condicional da Etapa ---
    return (
        <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center p-4">
            <Toaster position="top-center" reverseOrder={false} toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-6xl"
                >
                    {step === 'intro' && <IntroScreen onStart={() => setStep('gender')} />}
                    {step === 'gender' && <GenderScreen onGenderSelect={handleGenderSelect} />}
                    {step === 'photo' && <PhotoScreen onPhotoSelected={handlePhotoSelect} />}
                    {step === 'closet' && activeGender && <ClosetScreen clothes={clothes} activeGender={activeGender} activeCategory={activeCategory} setActiveCategory={setActiveCategory} onGarmentSelected={handleGarmentSelect} />}
                    {step === 'confirm' && humanFilePreview && selectedGarment && <ConfirmScreen humanImage={humanFilePreview} garment={selectedGarment} onConfirm={handleProcess} onBack={() => setStep('closet')} />}
                    {step === 'loading' && <LoadingScreen message={loadingMessage} />}
                    {step === 'result' && resultImage && <ResultScreen resultImage={resultImage} onShowVR={() => setShowVR(true)} onRestart={handleReset} />}
                </motion.div>
            </AnimatePresence>
            {showVR && resultImage && <VRScene imageUrl={resultImage} onClose={() => setShowVR(false)} />}
        </div>
    );
}


// --- Componentes de cada Etapa ---

const IntroScreen = ({ onStart }: { onStart: () => void }) => (
    <div className="text-center">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">VesteJá</h1>
        <p className="text-gray-400 mt-4 text-xl">Seu provador de roupas virtual com Inteligência Artificial.</p>
        <p className="mt-2 text-gray-500">Pronto para começar a experimentar?</p>
        <button onClick={onStart} className="mt-8 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all">Começar</button>
    </div>
);

const GenderScreen = ({ onGenderSelect }: { onGenderSelect: (gender: Gender) => void }) => (
    <div className="text-center">
        <h2 className="text-3xl font-bold mb-8">Qual closet você gostaria de explorar?</h2>
        <div className="flex flex-col sm:flex-row gap-8 mt-10 justify-center">
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => onGenderSelect('feminino')} className="text-2xl font-bold bg-pink-600/80 hover:bg-pink-500 p-8 rounded-2xl">Moda Feminina</motion.button>
            <motion.button whileHover={{ scale: 1.05 }} onClick={() => onGenderSelect('masculino')} className="text-2xl font-bold bg-blue-600/80 hover:bg-blue-500 p-8 rounded-2xl">Moda Masculina</motion.button>
        </div>
    </div>
);

const PhotoScreen = ({ onPhotoSelected }: { onPhotoSelected: (file: File) => void }) => {
    const [mode, setMode] = useState<'upload' | 'camera'>('upload');
    const [analysisState, setAnalysisState] = useState<{status: 'idle' | 'analyzing' | 'error', message: string}>({ status: 'idle', message: '' });
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const analyzePhoto = async (imageFile: File) => {
        setAnalysisState({ status: 'analyzing', message: 'Inicializando IA no navegador...' });
        await tf.ready();
        setAnalysisState({ status: 'analyzing', message: 'Analisando iluminação...' });
        const image = new Image();
        const imageUrl = URL.createObjectURL(imageFile);
        image.src = imageUrl;
        await new Promise(resolve => { image.onload = resolve });
        try {
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(image, 0, 0);
                const imageData = ctx?.getImageData(0, 0, image.width, image.height).data;
                let totalBrightness = 0;
                if (imageData) {
                    for (let i = 0; i < imageData.length; i += 4) {
                        totalBrightness += (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
                    }
                    const avgBrightness = totalBrightness / (imageData.length / 4);
                    if (avgBrightness < 60) {
                        setAnalysisState({ status: 'error', message: 'Iluminação muito baixa. Por favor, encontre um local mais claro.' });
                        return;
                    }
                    if (avgBrightness > 195) {
                        setAnalysisState({ status: 'error', message: 'Excesso de luz na foto. Tente uma iluminação mais suave.' });
                        return;
                    }
                }
            }
        } catch (e) { console.error("Erro na análise de iluminação", e); }
        try {
            setAnalysisState({ status: 'analyzing', message: 'Verificando a pose...' });
            const model = poseDetection.SupportedModels.MoveNet;
            const detector = await poseDetection.createDetector(model);
            const poses = await detector.estimatePoses(image);
            detector.dispose();
            if (poses.length === 0) {
                setAnalysisState({ status: 'error', message: 'Nenhuma pessoa detectada. Verifique o enquadramento.' });
                return;
            }
            const keypoints = poses[0].keypoints;
            const head = keypoints.find(k => k.name === 'nose' && k.score! > 0.5);
            const leftHip = keypoints.find(k => k.name === 'left_hip' && k.score! > 0.3);
            const rightHip = keypoints.find(k => k.name === 'right_hip' && k.score! > 0.3);
            const leftAnkle = keypoints.find(k => k.name === 'left_ankle' && k.score! > 0.4);
            const rightAnkle = keypoints.find(k => k.name === 'right_ankle' && k.score! > 0.4);
            const hasHips = leftHip || rightHip;
            const hasAnkles = leftAnkle || rightAnkle;
            if (!head || (!hasHips && !hasAnkles)) {
                setAnalysisState({ status: 'error', message: 'Pose inválida. Enquadre o corpo inteiro ou, no mínimo, da cintura para cima.' });
                return;
            }
        } catch(e) {
            console.error("Erro na detecção de pose", e);
            setAnalysisState({ status: 'error', message: 'Não foi possível analisar a pose. Tente novamente.' });
            return;
        }
        URL.revokeObjectURL(imageUrl);
        setAnalysisState({ status: 'idle', message: '' });
        onPhotoSelected(imageFile);
    };
    const handleCapture = useCallback(async () => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                const blob = await fetch(imageSrc).then(res => res.blob());
                analyzePhoto(new File([blob], "webcam.jpg", { type: "image/jpeg" }));
            }
        }
    }, [webcamRef]);
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            analyzePhoto(e.target.files[0]);
        }
    };
    return (
        <div className="text-center">
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            <h2 className="text-3xl font-bold mb-8">Passo 1: Escolha sua foto</h2>
            {analysisState.status === 'idle' && (
                <>
                    <div className="flex justify-center gap-4 mb-4"><button onClick={() => setMode('upload')} className={`px-4 py-2 rounded-md ${mode === 'upload' ? 'bg-purple-600' : 'bg-gray-700'}`}>Enviar Foto</button><button onClick={() => setMode('camera')} className={`px-4 py-2 rounded-md ${mode === 'camera' ? 'bg-purple-600' : 'bg-gray-700'}`}>Usar Câmera</button></div>
                    {mode === 'camera' ? (
                        <div><Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="rounded-lg mx-auto" /><button onClick={handleCapture} className="mt-4 w-full bg-green-500 px-6 py-2 rounded-lg font-semibold">Tirar e Analisar Foto</button></div>
                    ) : (
                        <div className="p-4 border-2 border-dashed border-gray-600 rounded-lg min-h-[250px] flex flex-col justify-center items-center"><span className="text-gray-400 mb-4">Selecione uma foto do corpo inteiro ou da cintura para cima.</span><input type="file" accept="image/*" onChange={handleFileUpload} className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"/></div>
                    )}
                </>
            )}
            {analysisState.status === 'analyzing' && <div className="flex flex-col items-center justify-center h-64"><Spinner /><p className="mt-4 text-lg">{analysisState.message}</p></div>}
            {analysisState.status === 'error' && <div className="flex flex-col items-center justify-center h-64 bg-red-900/50 p-6 rounded-lg"><p className="text-red-300 font-semibold">Análise Falhou</p><p className="mt-2 text-white">{analysisState.message}</p><button onClick={() => setAnalysisState({ status: 'idle', message: '' })} className="mt-6 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">Tentar Novamente</button></div>}
        </div>
    );
};

// ✅ CORREÇÃO DE TIPAGEM APLICADA AQUI
interface ClosetScreenProps {
  clothes: Garment[];
  activeGender: Gender;
  activeCategory: string | null;
  setActiveCategory: (category: string) => void;
  onGarmentSelected: (garment: Garment) => void;
}

const ClosetScreen = ({ clothes, activeGender, activeCategory, setActiveCategory, onGarmentSelected }: ClosetScreenProps) => {
    const availableCategories = [...new Set(clothes.filter((item: Garment) => item.gender.includes(activeGender)).map((item: Garment) => item.category))];
    const filteredClothes = clothes.filter((item: Garment) => item.gender.includes(activeGender) && item.category === activeCategory);
    
    return (
        <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Passo 2: Escolha sua roupa</h2>
            <div className="flex gap-2 mb-4 justify-center flex-wrap">
                {availableCategories.map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setActiveCategory(cat)} 
                        className={`px-4 py-1 rounded-full text-sm ${activeCategory === cat ? 'bg-purple-600 font-bold' : 'bg-gray-700'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
            
            <motion.div
                key={activeCategory}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {filteredClothes.length > 0 ? (
                    <Swiper
                        effect={'coverflow'}
                        grabCursor={true}
                        centeredSlides={true}
                        slidesPerView={'auto'}
                        navigation={true}
                        pagination={{ clickable: true }}
                        coverflowEffect={{
                            rotate: 40,
                            stretch: -30,
                            depth: 100,
                            modifier: 1,
                            slideShadows: true,
                        }}
                        modules={[EffectCoverflow, Pagination, Navigation]}
                        className="closet-swiper-container"
                    >
                        {filteredClothes.map((item: Garment) => (
                                <SwiperSlide key={item.id} className="closet-swiper-slide">
                                    <img 
                                        src={item.imageUrl} 
                                        alt={item.name} 
                                        onClick={() => onGarmentSelected(item)} 
                                    />
                                    <p>{item.name}</p>
                                </SwiperSlide>
                            ))
                        }
                    </Swiper>
                ) : (
                    <div className="h-[480px] flex items-center justify-center">
                        <p className="text-gray-500">Nenhuma peça encontrada nesta categoria.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

const ConfirmScreen = ({ humanImage, garment, onConfirm, onBack }: any) => (
    <div className="text-center">
        <h2 className="text-3xl font-bold mb-8">Passo 3: Confirme sua escolha</h2>
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
            <div className="text-center"><p className="mb-2 font-semibold">Sua Foto</p><img src={humanImage} alt="Sua prévia" className="max-h-64 mx-auto rounded-md" /></div>
            <p className="text-4xl font-thin">+</p>
            <div className="text-center"><p className="mb-2 font-semibold">Roupa Escolhida</p><img src={garment.imageUrl} alt={garment.name} className="max-h-64 mx-auto rounded-md" /></div>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
            <button onClick={onBack} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-all">Voltar</button>
            <button onClick={onConfirm} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all">Experimentar!</button>
        </div>
    </div>
);

const LoadingScreen = ({ message }: { message: string }) => (
    <div className="text-center flex flex-col items-center justify-center h-64">
        <Spinner />
        <h2 className="text-2xl font-bold mt-6">{message}</h2>
        <p className="text-gray-400">Isso pode levar alguns instantes...</p>
    </div>
);

const ResultScreen = ({ resultImage, onShowVR, onRestart }: any) => {
    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = 'VesteJa-Resultado.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="text-center">
            <h2 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-500">Pronto!</h2>
            <p className="text-gray-400 mb-6">Aqui está o seu look completo.</p>
            <img src={resultImage} alt="Resultado final" className="max-w-md w-full mx-auto rounded-lg shadow-2xl" />
            <div className="mt-8 flex gap-4 justify-center">
                <button onClick={onShowVR} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg">Ver em VR</button>
                <button onClick={handleDownload} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg">Baixar Imagem</button>
                <button onClick={onRestart} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg">Experimentar Outro</button>
            </div>
        </div>
    );
};